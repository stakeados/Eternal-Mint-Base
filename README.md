# 🔵 Base Eternal Mint

**The Mobile-First Onchain Artifact Minter.**
[https://eternalmint.stakeados.com](https://eternalmint.stakeados.com)

Eternal Mint is a decentralized application (dApp) built on **Base** that allows users to immortalize their memories on the blockchain with a focus on **Mobile UX**, **Gas Optimization**, and **True Immutability**.

## 🚀 Key Features

*   **📱 Mobile-First Architecture**: Solves the "Out of Gas" simulation errors common in mobile wallets (Coinbase Wallet, Rainbow, Metamask Mobile) using dynamic gas estimation and safety buffers.
*   **🎨 "The Guillotine" Compression Engine**: A client-side recursive compression algorithm that optimizes images to <12KB (Pro) or <9KB (Retro) with custom dithering. This allows cheap, reliable storage directly on EVM (or IPFS/Arweave via expansion).
*   **⚡ Multicall Gallery**: Fetches 100+ NFTs in a single RPC call, reducing gallery load times from minutes to seconds.
*   **🛡️ Trustless & Eternal**: The smart contract ownership has been **renounced**. The protocol is immutable, censorship-resistant, and has no "Admin Keys".
*   **🔑 Genesis Keys**: ERC-1155 Integration for community-gated free minting.

## 🛠️ Tech Stack

*   **Framework**: Next.js 14+ (App Router)
*   **Blockchain**: Base Mainnet
*   **Frontend**: TailwindCSS, OnchainKit, Framer Motion
*   **Web3 Hooks**: Wagmi v2, Viem.
*   **Imaging**: Custom Canvas Dithering Algorithm.

## 📦 Installation

To run this project locally:

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/ethernal-mint.git

# 2. Install dependencies
npm install

# 3. Environment Setup
# Create a .env.local file with:
NEXT_PUBLIC_WALLET_PROJECT_ID=your_reown_id
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_coinbase_api_key
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org

# 4. Run Development Server
npm run dev
```

## 📜 License

This project is open source and available under the **MIT License**.

---

*Built with legendary focus by the Stakeados Community.* 🔵
