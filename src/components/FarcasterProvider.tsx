'use client';

import { useEffect } from 'react';
import sdk from '@farcaster/frame-sdk';

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const init = async () => {
            try {
                // Initialize the SDK and signal readiness
                await sdk.actions.ready();
            } catch (err) {
                console.error('Failed to initialize Farcaster SDK:', err);
            }
        };

        init();
    }, []);

    return <>{children}</>;
}
