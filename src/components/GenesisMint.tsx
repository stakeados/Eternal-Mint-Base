'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, erc20Abi, Address } from 'viem';
import { CREATOR_TOKEN_ADDRESS, GENESIS_KEY_ADDRESS, GENESIS_KEY_ABI } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction, TransactionToast, TransactionToastIcon, TransactionToastLabel, TransactionToastAction } from '@coinbase/onchainkit/transaction';

export function GenesisMint() {
    const { address, isConnected } = useAccount();
    const { t } = useI18n();
    const { writeContractAsync } = useWriteContract();

    // Stats
    const { data: totalSupply } = useReadContract({
        address: GENESIS_KEY_ADDRESS as Address,
        abi: GENESIS_KEY_ABI,
        functionName: 'totalSupply',
        query: { refetchInterval: 10000 }
    });

    const { data: maxSupply } = useReadContract({
        address: GENESIS_KEY_ADDRESS as Address,
        abi: GENESIS_KEY_ABI,
        functionName: 'MAX_SUPPLY',
    });

    // Cost (Fixed at 100,000 for now, could read from contract but it's immutable there)
    const PRICE = parseEther('100000');

    // Allowance Check
    const { data: allowance } = useReadContract({
        address: CREATOR_TOKEN_ADDRESS as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: address ? [address, GENESIS_KEY_ADDRESS as Address] : undefined,
    });

    const hasAllowance = allowance ? allowance >= PRICE : false;

    // Mint Logic
    const handleMint = async () => {
        // Logic handled by Transaction Button primarily, but fallback here if needed
    };

    // Progress Calculation
    const total = Number(totalSupply || 0);
    const max = Number(maxSupply || 500);
    const percentage = Math.min((total / max) * 100, 100);

    return (
        <div className="w-full max-w-lg mx-auto mt-12 mb-12 p-1 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-yellow-500/40 to-yellow-500/20 dark:from-yellow-600 dark:via-yellow-400 dark:to-yellow-600 shadow-xl dark:shadow-[0_0_40px_-10px_rgba(234,179,8,0.3)] animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="bg-white dark:bg-black/90 backdrop-blur-xl rounded-xl p-8 border border-yellow-500/10 dark:border-yellow-500/20">

                {/* Header */}
                <div className="text-center mb-6 space-y-2">
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-yellow-600 to-yellow-800 dark:from-yellow-200 dark:to-yellow-500 uppercase tracking-widest drop-shadow-sm">
                        {t('genesis.title')}
                    </h2>
                    <p className="text-gray-600 dark:text-yellow-100/60 text-sm font-medium">
                        {t('genesis.desc')}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-xs text-yellow-500/80 mb-2 font-mono uppercase">
                        <span>{t('genesis.supply')} {total} / {max}</span>
                        <span>{percentage.toFixed(1)}% Minted</span>
                    </div>
                    <div className="h-3 w-full bg-yellow-900/30 rounded-full overflow-hidden border border-yellow-500/10">
                        <div
                            className="h-full bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all duration-1000 ease-out"
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Price Tag */}
                <div className="flex justify-center mb-8">
                    <div className="px-6 py-2 bg-red-900/20 border border-red-500/30 rounded-full flex items-center gap-2">
                        <span className="text-red-400 font-bold font-mono text-sm animate-pulse">🔥 {t('genesis.burn_warning')}</span>
                    </div>
                </div>

                {/* Action Button */}
                {isConnected ? (
                    <Transaction
                        capabilities={{
                            paymasterService: {
                                url: process.env.NEXT_PUBLIC_RPC_URL || ''
                            }
                        }}
                        calls={async () => {
                            const calls = [];
                            if (!hasAllowance) {
                                calls.push({
                                    address: CREATOR_TOKEN_ADDRESS as Address,
                                    abi: erc20Abi,
                                    functionName: 'approve',
                                    args: [GENESIS_KEY_ADDRESS as Address, PRICE],
                                });
                            }
                            calls.push({
                                address: GENESIS_KEY_ADDRESS as Address,
                                abi: GENESIS_KEY_ABI,
                                functionName: 'mint',
                                args: [],
                            });
                            return calls;
                        }}
                    >
                        <TransactionButton
                            text={hasAllowance ? t('genesis.mint') : t('mint.action.approve')}
                            className="w-full py-4 text-lg font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black shadow-lg hover:shadow-yellow-500/20 transition-all border-none"
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
                ) : (
                    <div className="text-center text-yellow-500/50 text-sm">
                        {t('step1.desc')}
                    </div>
                )}
            </div>
        </div>
    );
}
