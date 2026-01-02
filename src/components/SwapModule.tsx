'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { Address, parseEther, formatUnits } from 'viem';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction, TransactionToast, TransactionToastIcon, TransactionToastLabel, TransactionToastAction } from '@coinbase/onchainkit/transaction';
import { useI18n } from '@/lib/i18n';
import { CREATOR_TOKEN_ADDRESS, ERC20_ABI } from '@/lib/constants';

const PRESETS = [
    { label: 'Starter Pack', amount: 1000, desc: '1 Eternal Mint', icon: '💎' },
    { label: 'Creator Pack', amount: 10000, desc: '10 Eternal Mints', icon: '🚀' },
    { label: 'Genesis Pack', amount: 100000, desc: '1 Genesis Key', icon: '👑' }
];

const ETH_NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

interface SwapModuleProps {
    onSuccess?: () => void;
}

export function SwapModule({ onSuccess }: SwapModuleProps) {
    const { t } = useI18n();
    const { address } = useAccount();
    const chainId = useChainId();
    const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
    const [routeSummary, setRouteSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [txCalls, setTxCalls] = useState<any[]>([]);
    const [swapTxHash, setSwapTxHash] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Read Balance for display
    const { data: balance } = useReadContract({
        address: CREATOR_TOKEN_ADDRESS as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    const fetchQuote = async (amount: number) => {
        setIsLoading(true);
        try {
            // Price Discovery
            // We fetch a route for a small amount of ETH to find the current rate
            const testAmountIn = 100000000000000n; // 0.0001 ETH
            const discoveryRes = await fetch(
                `https://aggregator-api.kyberswap.com/base/api/v1/routes?tokenIn=${ETH_NATIVE}&tokenOut=${CREATOR_TOKEN_ADDRESS}&amountIn=${testAmountIn.toString()}`
            );
            const discoveryData = await discoveryRes.json();

            if (discoveryData.data?.routeSummary) {
                const testAmountOut = BigInt(discoveryData.data.routeSummary.amountOut);

                // STEP 2: Calculate exact amountIn for target amount tokens
                // amountOut (tokens) = amountIn (eth) * (testAmountOut / testAmountIn)
                // amountIn (eth) = amountOut (tokens) * testAmountIn / testAmountOut
                const targetAmountOut = BigInt(amount) * 10n ** 18n; // 1000 STAKE
                const requiredAmountIn = (targetAmountOut * testAmountIn) / testAmountOut;

                // Final Quote with requiredAmountIn
                const finalRes = await fetch(
                    `https://aggregator-api.kyberswap.com/base/api/v1/routes?tokenIn=${ETH_NATIVE}&tokenOut=${CREATOR_TOKEN_ADDRESS}&amountIn=${requiredAmountIn.toString()}`
                );
                const finalData = await finalRes.json();

                if (finalData.data?.routeSummary) {
                    setRouteSummary(finalData.data.routeSummary);
                }
            }
        } catch (err) {
            console.error('Dynamic Quote fetch failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Prepare TX calls when user wants to buy
    const prepareTransaction = async () => {
        if (!routeSummary || !address) return;

        try {
            const response = await fetch(`https://aggregator-api.kyberswap.com/base/api/v1/route/build`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    routeSummary,
                    sender: address,
                    recipient: address,
                    slippageTolerance: 200, // 2% for volatility/creator tokens
                    deadline: Math.floor(Date.now() / 1000) + 1200
                })
            });
            const data = await response.json();
            if (data.data?.data) {
                setTxCalls([{
                    to: data.data.routerAddress as Address,
                    data: data.data.data as `0x${string}`,
                    value: BigInt(routeSummary.amountIn)
                }]);
            }
        } catch (err) {
            console.error('Build failed:', err);
        }
    };

    useEffect(() => {
        fetchQuote(selectedPreset.amount);
    }, [selectedPreset]);

    useEffect(() => {
        const autoPrepare = async () => {
            if (routeSummary && address) {
                await prepareTransaction();
            }
        };
        autoPrepare();
    }, [routeSummary, address]);

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-background/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-primary/20 animate-in fade-in zoom-in duration-500">
            <h3 className="text-2xl font-black mb-2 text-center text-primary tracking-tight">💎 {t('swap.needed')}</h3>
            <div className="flex flex-col items-center gap-1 mb-8">
                <p className="text-sm text-muted-foreground text-center px-4">
                    {t('swap.powered_by')}
                </p>
                {mounted && balance !== undefined && (
                    <div className="flex items-center gap-2 text-[10px] text-primary/70 font-medium bg-primary/5 px-3 py-1 rounded-full border border-primary/20">
                        <span>{t('balance.current')}</span>
                        <span className="font-bold">{Number(formatUnits(balance, 18)).toLocaleString()} Stakeados</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.amount}
                        onClick={() => setSelectedPreset(preset)}
                        className={`group relative flex items-center justify-between p-4 border rounded-2xl transition-all duration-300 ${selectedPreset.amount === preset.amount
                            ? 'bg-primary/20 border-primary ring-2 ring-primary/50 scale-[1.02]'
                            : 'bg-secondary/10 border-primary/10 hover:border-primary/40'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">{preset.icon}</span>
                            <div className="text-left">
                                <p className="font-bold text-lg leading-none mb-1 group-hover:text-primary transition-colors">
                                    {preset.amount.toLocaleString()} Stakeados
                                </p>
                                <p className="text-xs text-muted-foreground">{preset.desc}</p>
                            </div>
                        </div>
                        {selectedPreset.amount === preset.amount && (
                            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                SELECTED
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {routeSummary && (
                <div className="mb-6 p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center animate-in slide-in-from-bottom-2 duration-300">
                    <p className="text-xs text-muted-foreground mb-1">{t('swap.cost_label')}</p>
                    <p className="text-lg font-black text-primary">
                        {(Number(routeSummary.amountIn) / 1e18).toFixed(6)} ETH
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 italic mt-1">
                        + network fees. Slippage: 2%
                    </p>
                </div>
            )}

            <Transaction
                chainId={chainId}
                calls={txCalls}
                onSuccess={(res) => {
                    const hash = res.transactionReceipts?.[0]?.transactionHash || (res as any).transactionHash;
                    if (hash) {
                        setSwapTxHash(hash);
                        if (onSuccess) onSuccess();
                    }
                }}
            >
                <TransactionButton
                    className="w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:grayscale"
                    text={isLoading ? t('swap.calculating') : !txCalls.length ? t('swap.preparing') : `Buy ${selectedPreset.amount.toLocaleString()} Tokens`}
                    disabled={isLoading || !txCalls.length}
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

            {swapTxHash && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <a
                        href={`https://basescan.org/tx/${swapTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center py-2 text-xs font-bold text-primary hover:underline"
                    >
                        🔗 {t('success.view_basescan')}
                    </a>
                </div>
            )}

            <p className="mt-8 text-[10px] text-center text-muted-foreground/60 leading-tight">
                {t('swap.footer')}
            </p>
        </div>
    );
}
