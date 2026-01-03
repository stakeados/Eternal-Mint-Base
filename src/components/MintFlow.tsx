'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useBalance, useSwitchChain, usePublicClient } from 'wagmi';
import { Address, formatUnits, parseEther, erc20Abi } from 'viem';
import { base } from 'viem/chains';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction, TransactionToast, TransactionToastIcon, TransactionToastLabel, TransactionToastAction } from '@coinbase/onchainkit/transaction';
import { useI18n } from '@/lib/i18n';
import { CREATOR_TOKEN_ADDRESS, MINT_CONTRACT_ADDRESS, ERC20_ABI, ETERNAL_MINT_ABI, GENESIS_KEY_ABI } from '@/lib/constants';
import { SwapModule } from './SwapModule';
import { ImageUploader } from './ImageUploader';
import { OnboardingTutorial } from './OnboardingTutorial';

// Constants
const MINT_PRICE_RAW = 1000000000000000000000n; // 1000 tokens * 1e18

export function MintFlow() {
    const { address, isConnected, connector } = useAccount();
    const publicClient = usePublicClient();
    const chainId = useChainId();
    const { t } = useI18n();
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [mintTxHash, setMintTxHash] = useState<string | null>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    const [isMintSuccess, setIsMintSuccess] = useState(false);
    const { switchChain } = useSwitchChain();

    // STRICT STATE MACHINE: 'idle' | 'needs_approval' | 'approving' | 'approved' | 'minting' | 'success'
    // Simplified for UI Button Logic

    // Environment Detection for Compression Strategy
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }, []);

    const isSmartWallet = connector?.id?.toLowerCase().includes('coinbase') || connector?.id?.toLowerCase().includes('safe');
    // Farcaster (Warpcast) uses an embedded webview where high-gas txs might fail. Treat as restricted.
    const isFarcaster = typeof navigator !== 'undefined' && /Warpcast/i.test(navigator.userAgent);
    const isRestrictedEnv = isMobile || isSmartWallet || isFarcaster;

    // SEPARATE HOOKS for 2-step flow
    const { writeContractAsync: writeApprove, isPending: isApproving } = useWriteContract();
    const { writeContractAsync: writeMint, isPending: isMinting } = useWriteContract();

    const { data: ethBalance } = useBalance({ address });

    const hasEnoughEth = useMemo(() => {
        if (!ethBalance) return true;
        return ethBalance.value >= parseEther('0.00005'); // Lowered to matching real ~$0.08 costs
    }, [ethBalance]);

    // Read Token Balance
    const { data: balance, isLoading: isLoadingBalance, refetch: refetchBalance } = useReadContract({
        address: CREATOR_TOKEN_ADDRESS as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        }
    });

    // Check Allowance
    const { data: allowance, isLoading: isLoadingAllowance, refetch: refetchAllowance } = useReadContract({
        address: CREATOR_TOKEN_ADDRESS as Address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, MINT_CONTRACT_ADDRESS as Address] : undefined,
        query: {
            enabled: !!address,
            refetchInterval: 2000,
        }
    });

    // Check if user holds Access NFT (Free Mint)
    const { data: accessNFTAddress, isLoading: isLoadingNFTAddress } = useReadContract({
        address: MINT_CONTRACT_ADDRESS as Address,
        abi: ETERNAL_MINT_ABI,
        functionName: 'accessNFT',
    });

    const { data: accessNFTBalance, isLoading: isLoadingNFTBalance } = useReadContract({
        address: accessNFTAddress as Address,
        abi: GENESIS_KEY_ABI,
        functionName: 'balanceOf',
        args: address ? [address, 1n] : undefined,
        query: {
            enabled: !!address && !!accessNFTAddress && accessNFTAddress !== '0x0000000000000000000000000000000000000000',
        }
    });

    // Hydration Fix
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-refresh allowance when approval transaction finishes
    useEffect(() => {
        if (!isApproving) {
            refetchAllowance();
        }
    }, [isApproving, refetchAllowance]);

    const isLoadingData = isLoadingBalance || isLoadingAllowance || isLoadingNFTAddress || isLoadingNFTBalance;
    const isFreeMint = accessNFTBalance ? accessNFTBalance > 0n : false;
    const hasEnoughBalance = isFreeMint ? true : (balance !== undefined ? balance >= MINT_PRICE_RAW : false);

    // STRICT Condition for "Needs Approval"
    const needsApproval = isFreeMint ? false : (allowance ? allowance < MINT_PRICE_RAW : true);

    // Prevent hydration mismatch (MUST BE AFTER HOOKS)
    if (!mounted) return null;

    // --- ACTIONS ---

    const handleApprove = async () => {
        try {
            const PRICE = parseEther('1000');
            await writeApprove({
                address: CREATOR_TOKEN_ADDRESS as Address,
                abi: erc20Abi,
                functionName: 'approve',
                args: [MINT_CONTRACT_ADDRESS as Address, PRICE],
            });
            // Don't set success or anything here, just wait for refetchAllowance to update state naturally
            // The UI will re-render and switch buttons when needsApproval becomes false
            setTimeout(refetchAllowance, 1000); // Polling will catch it, but this helps responsiveness
        } catch (err) {
            console.error("Approve Error:", err);
        }
    };



    const handleMint = async () => {
        try {
            let tokenURIArg = "";
            if (imageBase64) {
                const metadata = {
                    name: "Eternal Artifact",
                    description: "On-Chain Base",
                    image: imageBase64,
                };
                const jsonString = JSON.stringify(metadata);
                // Simple Data URI for metadata
                tokenURIArg = `data:application/json;base64,${btoa(jsonString)}`;

                // DEBUG CRÍTICO
                const payloadSize = new Blob([tokenURIArg]).size;

                // 16KB Limit for ALL Restricted Envs (Mobile, Farcaster, Smart Wallets)
                if (payloadSize > 16000 && isRestrictedEnv) {
                    alert(`⚠️ Imagen demasiado grande (${(payloadSize / 1024).toFixed(2)}KB). Por favor, elige otra versión más ligera.`);
                    return;
                }
            }

            // 1. Dynamic Gas Estimation (The Gold Standard)
            let gasLimit = 0n;
            if (publicClient) {
                try {
                    const estimatedGas = await publicClient.estimateContractGas({
                        address: MINT_CONTRACT_ADDRESS as Address,
                        abi: ETERNAL_MINT_ABI,
                        functionName: 'burnAndMint',
                        args: [tokenURIArg],
                        account: address,
                    });
                    // Add 50% Safety Buffer for L2 variance/Blobs
                    gasLimit = (estimatedGas * 150n) / 100n;
                } catch (estimateError) {
                    console.warn("⚠️ Falling back to Safe Default (2.5M) due to estimation failure");
                    gasLimit = 2500000n;
                }
            } else {
                gasLimit = 2500000n; // Fallback if client not ready
            }

            const txHash = await writeMint({
                address: MINT_CONTRACT_ADDRESS as Address,
                abi: ETERNAL_MINT_ABI,
                functionName: 'burnAndMint',
                args: [tokenURIArg],
                gas: gasLimit,
            });
            setMintTxHash(txHash);
            setIsMintSuccess(true);
            refetchBalance(); // Update balance immediately after mint to clean UI

        } catch (err) {
            console.error("Mint Error:", err);
        }
    };

    // Render logic
    return (
        <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">
            {!isConnected && (
                <div className="text-center py-20 animate-pulse">
                    <h2 className="text-xl font-bold mb-2 text-gray-400">{t('step1.desc')}</h2>
                </div>
            )}

            {isConnected && chainId !== base.id && (
                <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/10 border-2 border-red-500 rounded-xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="text-4xl">⚠️</div>
                    <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Wrong Network</h3>
                    <p className="text-center text-muted-foreground">Please connect to Base Mainnet to continue.</p>
                    <button
                        onClick={() => switchChain({ chainId: base.id })}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
                    >
                        Switch to Base
                    </button>
                    <button
                        onClick={() => switchChain({ chainId: base.id })}
                        className="text-xs text-muted-foreground underline"
                    >
                        Or try checking your wallet manually
                    </button>
                </div>
            )}

            {isConnected && chainId === base.id && (
                <div className="space-y-6">
                    {/* Step 1: Check Balance & Swap */}
                    {!isLoadingData && !hasEnoughBalance && !isMintSuccess && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in">
                            <div className="bg-gradient-to-br from-secondary/30 to-secondary/10 border border-primary/20 text-card-foreground p-6 rounded-2xl shadow-sm text-center backdrop-blur-sm">
                                <h3 className="text-xl font-bold mb-2 text-primary">💎 {t('intro.title')}</h3>
                                <p className="text-muted-foreground mb-4 leading-relaxed">{t('intro.description')}</p>
                            </div>
                            <SwapModule onSuccess={() => {
                                setTimeout(() => refetchBalance(), 2000); // 2s delay for RPC indexing
                            }} />
                        </div>
                    )}

                    {/* Step 2: Upload Image */}
                    {(isLoadingData || hasEnoughBalance) && !imageBase64 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {isLoadingData ? (
                                <div className="text-center py-10 text-muted-foreground animate-pulse">{t('balance.loading')}</div>
                            ) : (
                                <ImageUploader
                                    onImageReady={(base64) => setImageBase64(base64)}
                                    isRestrictedEnv={isRestrictedEnv}
                                />
                            )}
                        </div>
                    )}

                    {/* Step 3: Mint Action Area */}
                    {hasEnoughBalance && imageBase64 && !mintTxHash && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                            <img src={imageBase64} alt="To Mint" className="w-full rounded-xl shadow-2xl border-2 border-primary/20" />

                            <div className="p-4 bg-secondary/10 border border-primary/20 rounded-lg backdrop-blur-md">
                                {isFreeMint ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 animate-pulse">
                                            {t('mint.price.free')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-sm font-bold text-primary">
                                            {t('mint.cost.tokens')}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <span>{t('balance.current')}</span>
                                            <span className={(balance || 0n) < MINT_PRICE_RAW ? "text-red-500 font-bold" : "text-primary font-medium"}>
                                                {Number(formatUnits(balance || 0n, 18)).toLocaleString()} Stakeados
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!hasEnoughEth && (
                                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-500 text-xs text-center animate-pulse">
                                    ⚠️ {t('mint.gas_warning')}
                                </div>
                            )}

                            {/* STATE MACHINE BUTTONS */}
                            {/* Transaction Component Handling Approve + Mint */}
                            <Transaction
                                capabilities={{
                                    paymasterService: {
                                        url: process.env.NEXT_PUBLIC_RPC_URL || ''
                                    }
                                }}
                                calls={async () => {
                                    const calls = [];
                                    const PRICE = parseEther('1000');

                                    // 1. Approve if needed
                                    if (needsApproval) {
                                        calls.push({
                                            address: CREATOR_TOKEN_ADDRESS as Address,
                                            abi: erc20Abi,
                                            functionName: 'approve',
                                            args: [MINT_CONTRACT_ADDRESS as Address, PRICE],
                                        });
                                    }

                                    // 2. Prepare Metadata for Mint
                                    let tokenURIArg = "";
                                    if (imageBase64) {
                                        const metadata = {
                                            name: "Eternal Artifact",
                                            description: "On-Chain Base",
                                            image: imageBase64,
                                        };
                                        const jsonString = JSON.stringify(metadata);
                                        tokenURIArg = `data:application/json;base64,${btoa(jsonString)}`;
                                    }

                                    // 3. Mint
                                    calls.push({
                                        address: MINT_CONTRACT_ADDRESS as Address,
                                        abi: ETERNAL_MINT_ABI,
                                        functionName: 'burnAndMint',
                                        args: [tokenURIArg],
                                    });

                                    return calls;
                                }}
                                onSuccess={(response) => {
                                    console.log("Transaction Successful", response);
                                    setIsMintSuccess(true);
                                    // Handle OnchainKit response structure
                                    const txHash = response.transactionReceipts?.[0]?.transactionHash || '';
                                    if (txHash) {
                                        setMintTxHash(txHash);
                                    }
                                    refetchBalance();
                                    refetchAllowance();
                                }}
                                onError={(e) => {
                                    console.error("Transaction Failed", e);
                                }}
                            >
                                <TransactionButton
                                    text={needsApproval ? t('mint.action.approve') : t('mint.action')}
                                    className="w-full py-4 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all rounded-xl"
                                />
                                <TransactionStatus>
                                    <TransactionStatusLabel />
                                    <TransactionStatusAction />
                                </TransactionStatus>
                                <TransactionToast>
                                    <TransactionToastIcon />
                                    <TransactionToastLabel />
                                    <TransactionToastAction />
                                </TransactionToast>
                            </Transaction>

                            {!isFreeMint && (balance || 0n) < MINT_PRICE_RAW && (
                                <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <p className="text-red-500 font-bold mb-2">🛑 {t('mint.error.insufficient')}</p>
                                </div>
                            )}

                            <button
                                onClick={() => setImageBase64(null)}
                                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    )}

                    {/* Step 4: Success Reveal */}
                    {mintTxHash && imageBase64 && isMintSuccess && (
                        <div className="animate-in zoom-in-50 duration-700 flex flex-col items-center text-center space-y-6 p-6 bg-secondary/20 rounded-2xl border border-primary/30">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-green-400 rounded-full blur opacity-75 animate-pulse"></div>
                                <div className="relative bg-background rounded-full p-2">
                                    <span className="text-4xl">✨</span>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-white">
                                {t('success.title')}
                            </h2>

                            <div className="relative group cursor-pointer" onClick={() => window.open(imageBase64, '_blank')}>
                                <img
                                    src={imageBase64}
                                    alt="Eternal NFT"
                                    className="w-64 h-64 object-cover rounded-xl shadow-2xl border-2 border-primary/50 transition-transform transform group-hover:scale-105"
                                />
                            </div>

                            <div className="space-y-3 w-full">
                                <a
                                    href={`https://basescan.org/tx/${mintTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full py-3 px-4 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg font-medium transition-colors border border-primary/20"
                                >
                                    🔗 {t('success.view_basescan')}
                                </a>

                                <button
                                    onClick={() => {
                                        setMintTxHash(null);
                                        setImageBase64(null);
                                        setIsMintSuccess(false);
                                    }}
                                    className="block w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {t('success.mint_another')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <OnboardingTutorial forceOpen={showTutorial} onClose={() => setShowTutorial(false)} />

            {/* Help Button */}


            <div className="flex justify-center mt-4">
                <button
                    onClick={() => setShowTutorial(true)}
                    className="text-xs text-muted-foreground hover:text-primary underline flex items-center gap-1"
                >
                    ℹ️ {t('tutorial.open')}
                </button>
            </div>


        </div>
    );
}
