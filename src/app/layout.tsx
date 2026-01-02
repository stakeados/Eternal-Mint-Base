import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { FarcasterProvider } from "@/components/FarcasterProvider";
import '@coinbase/onchainkit/styles.css'; // Import OnChainKit styles

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://eternalmint.stakeados.com/'),
  title: "Base Eternal Mint - Immortalize your Art",
  description: "Create and share art that lives forever on the Base blockchain. No servers, just you and the chain.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Base Eternal Mint",
    description: "Immortalize your memories onchain.",
    url: "https://eternalmint.stakeados.com/",
    siteName: "Base Eternal Mint",
    images: [
      {
        url: "/miniapp-cover.png",
        width: 1200,
        height: 630,
        alt: "Eternal Mint Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Base Eternal Mint",
    description: "Immortalize your art on Base.",
    images: ["/miniapp-cover.png"],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://eternalmint.stakeados.com/miniapp-cover.png",
    "fc:frame:button:1": "Mint Now",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": "https://eternalmint.stakeados.com/",
    "base:app_id": "6954941dc63ad876c9081a4f",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <FarcasterProvider>
            {children}
          </FarcasterProvider>
        </Providers>
      </body>
    </html>
  );
}
