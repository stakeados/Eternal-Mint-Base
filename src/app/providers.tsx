'use client';

import { ReactNode, useState } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import { http, createConfig, WagmiProvider } from 'wagmi';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';
import { ThemeProvider } from 'next-themes';

const config = createConfig({
    chains: [base],
    connectors: [
        injected(), // Recommended for Farcaster / Metamask
        // walletConnect({ projectId: ... }), // Disabled until valid ProjectID is provided to avoid 403s
        coinbaseWallet({
            appName: 'EternalMint',
            preference: 'all', // Allow both Smart Wallet and EOA modes
        }),
    ],
    transports: {
        [base.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'),
    },
    ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <OnchainKitProvider chain={base} apiKey={process.env.NEXT_PUBLIC_ONCHAIN_KIT_API_KEY}>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                        {children}
                    </ThemeProvider>
                </OnchainKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
