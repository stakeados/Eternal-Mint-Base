"use client";

import { useState } from "react";
import { MintFlow } from "@/components/MintFlow";
import { Gallery } from "@/components/Gallery";
import { GenesisMint } from "@/components/GenesisMint";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Identity, Avatar, Name } from '@coinbase/onchainkit/identity';
import { useI18n } from '@/lib/i18n';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'mint' | 'gallery'>('mint');
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-black dark:text-white transition-colors flex flex-col">
      {/* Header & Profile */}
      <header className="p-6 flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto w-full gap-4 relative z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Eternal Mint" className="h-16 w-auto drop-shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:scale-105 transition-transform" />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md p-1 rounded-full border border-gray-200 dark:border-neutral-800">
            <LanguageSelector />
            <ThemeToggle />
          </div>

          {/* Wallet Logic Moved Here */}
          <Wallet>
            <ConnectWallet className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 font-bold transition-all shadow-lg hover:shadow-blue-500/30">
              <Avatar className="h-6 w-6" />
              <Name className="text-white" />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 max-w-3xl relative z-0">

        {/* Navigation Tabs (Glassmorphism) */}
        <div className="flex p-1 rounded-2xl mb-8 bg-neutral-200/50 dark:bg-neutral-900/50 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-inner">
          <button
            onClick={() => setActiveTab('mint')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'mint'
              ? 'bg-white dark:bg-neutral-800 shadow-lg text-blue-600 dark:text-blue-400 scale-[1.02]'
              : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
          >
            🎨 {t('mint.action')}
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'gallery'
              ? 'bg-white dark:bg-neutral-800 shadow-lg text-purple-600 dark:text-purple-400 scale-[1.02]'
              : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
          >
            🖼️ {t('nav.gallery')}
          </button>
        </div>

        {/* Dynamic Content */}
        <div className="min-h-[400px]">
          {activeTab === 'mint' ? <MintFlow /> : <Gallery />}
        </div>

        {/* Genesis Section (Always Visible at bottom) */}
        <div className="mt-20 border-t border-gray-200 dark:border-neutral-800 pt-10">
          <GenesisMint />
        </div>

      </main>

      {/* Epic Footer */}
      <footer className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-100 to-transparent dark:from-neutral-900 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <p className="text-sm text-gray-500 dark:text-neutral-500 font-medium tracking-wide">
            Built with 💚 by Stakeados
          </p>
        </div>
      </footer>
    </div>
  );
}
