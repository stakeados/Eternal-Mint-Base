'use client';

import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { Address } from 'viem';
import { MINT_CONTRACT_ADDRESS, ETERNAL_MINT_ABI } from '@/lib/constants';

export function PayloadTester() {
    const { writeContractAsync } = useWriteContract();
    const [status, setStatus] = useState<string>('');

    const runTest = async (sizeKB: number) => {
        try {
            setStatus(`Generating ${sizeKB}KB payload...`);

            // Generate dummy string of 'a' repeated sizeKB * 1024 times
            const dummyData = 'a'.repeat(sizeKB * 1024);
            const payload = `data:text/plain;base64,${btoa(dummyData)}`;

            setStatus(`Simulating ${sizeKB}KB (${payload.length} chars)...`);

            const txHash = await writeContractAsync({
                address: MINT_CONTRACT_ADDRESS as Address,
                abi: ETERNAL_MINT_ABI,
                functionName: 'burnAndMint',
                args: [payload],
            });

            console.log(`✅ TEST ${sizeKB}KB SUCCESS:`, txHash);
            setStatus(`✅ Success! hash: ${txHash.slice(0, 10)}...`);
            alert(`✅ ${sizeKB}KB Payload Sent Successfully!`);

        } catch (error: any) {
            console.error(`❌ TEST ${sizeKB}KB FAILED:`, error);
            setStatus(`❌ Failed: ${error.message?.slice(0, 50)}...`);
            alert(`❌ ${sizeKB}KB Failed: ${error.shortMessage || error.message}`);
        }
    };

    return (
        <div className="mt-8 p-6 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl space-y-4">
            <h3 className="font-bold text-yellow-500 text-lg">🚧 CRASH TEST DUMMY (DEBUG)</h3>
            <p className="text-xs text-muted-foreground">
                Use these buttons to find the exact breaking point of the Base Smart Wallet simulation.
            </p>

            <div className="grid grid-cols-1 gap-3">
                <button
                    onClick={() => runTest(15)}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white font-mono text-sm rounded-lg transition"
                >
                    TEST 1: 15KB (~20k chars)
                </button>

                <button
                    onClick={() => runTest(25)}
                    className="p-3 bg-orange-600 hover:bg-orange-700 text-white font-mono text-sm rounded-lg transition"
                >
                    TEST 2: 25KB (~33k chars)
                </button>

                <button
                    onClick={() => runTest(40)}
                    className="p-3 bg-red-600 hover:bg-red-700 text-white font-mono text-sm rounded-lg transition"
                >
                    TEST 3: 40KB (~53k chars)
                </button>
            </div>

            {status && (
                <div className="p-2 bg-black/50 rounded text-xs font-mono text-white break-all">
                    {status}
                </div>
            )}
        </div>
    );
}
