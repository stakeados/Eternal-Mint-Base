import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem, Address } from 'viem';
import { MINT_CONTRACT_ADDRESS } from '../lib/constants';
import { useI18n } from '../lib/i18n';

// Event signature from EternalMint.sol (Updated: No imageURI in event)
const MINTED_EVENT = parseAbiItem('event MintedEternal(address indexed minter, uint256 indexed tokenId)');

const TOKEN_URI_ABI = [{
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
}] as const;

interface NFT {
    id: string;
    imageURI: string;
    txHash: string;
}

export function Gallery() {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const { t } = useI18n();
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        if (!isConnected || !address || !publicClient) return;

        const fetchNFTs = async () => {
            setLoading(true);
            try {
                const currentBlock = await publicClient.getBlockNumber();
                const allLogs = [];

                const CHUNK_SIZE = 500n; // Reduced to 500 (Max 1000 on Coinbase RPC)
                const MAX_CHUNKS = 200; // Increased count to cover same history range (~2-3 days)

                let toBlock = currentBlock;

                for (let i = 0; i < MAX_CHUNKS; i++) {
                    const fromBlock = toBlock - CHUNK_SIZE > 0n ? toBlock - CHUNK_SIZE : 0n;

                    try {
                        const logs = await publicClient.getLogs({
                            address: MINT_CONTRACT_ADDRESS,
                            event: MINTED_EVENT,
                            args: {
                                minter: address
                            },
                            fromBlock: fromBlock,
                            toBlock: toBlock
                        });

                        allLogs.push(...logs);

                        if (fromBlock === 0n) break;
                        toBlock = fromBlock - 1n;
                    } catch (err) {
                        console.warn(`Error fetching chunk ${i}:`, err);
                        break;
                    }
                }

                // Deduplicate logs by tokenId
                const uniqueLogsMap = new Map();
                allLogs.forEach(log => {
                    const id = log.args.tokenId?.toString();
                    if (id && !uniqueLogsMap.has(id)) {
                        uniqueLogsMap.set(id, log);
                    }
                });

                const uniqueLogs = Array.from(uniqueLogsMap.values());

                // Optimized: Fetch Token URIs using Multicall (1 Request vs N Requests)
                // This solves the "Many Minutes" loading time by batching all reads.
                const validNFTs: NFT[] = [];

                if (uniqueLogs.length > 0) {
                    try {
                        const results = await publicClient.multicall({
                            contracts: uniqueLogs.map(log => ({
                                address: MINT_CONTRACT_ADDRESS as Address,
                                abi: TOKEN_URI_ABI,
                                functionName: 'tokenURI',
                                args: [log.args.tokenId!]
                            }))
                        });

                        // Process results
                        results.forEach((result, index) => {
                            const log = uniqueLogs[index];
                            const id = log.args.tokenId;

                            if (result.status === 'success' && id) {
                                const uri = result.result as string;
                                let finalImageURI = uri;

                                // Parse Metadata if it's JSON
                                if (uri.startsWith('data:application/json')) {
                                    try {
                                        const base64Json = uri.split(',')[1];
                                        const jsonString = atob(base64Json);
                                        const metadata = JSON.parse(jsonString);
                                        if (metadata.image) {
                                            finalImageURI = metadata.image;
                                        }
                                    } catch (parseError) {
                                        console.error('Error parsing JSON metadata', parseError);
                                    }
                                }

                                validNFTs.push({
                                    id: id.toString(),
                                    imageURI: finalImageURI,
                                    txHash: log.transactionHash
                                });
                            }
                        });
                    } catch (multicallError) {
                        console.error("Multicall failed:", multicallError);
                    }
                }

                // Sort: Newest ID first (Desc)
                validNFTs.sort((a, b) => Number(b.id) - Number(a.id));

                setNfts(validNFTs);
            } catch (error) {
                console.error("Error fetching gallery:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNFTs();
    }, [address, isConnected, publicClient]);

    if (!isConnected) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <p>Conecta tu wallet para ver tu colección.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (nfts.length === 0) {
        return (
            <div className="text-center py-16 bg-secondary/10 rounded-xl border border-dashed border-secondary">
                <p className="text-lg font-medium text-foreground">Aún no tienes obras eternas.</p>
                <p className="text-sm text-muted-foreground mt-2">¡Ve a la pestaña "Mintear" y crea la primera!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4">
            {nfts.map((nft) => (
                <div key={`${nft.id}-${nft.txHash}`} className="group relative bg-black/40 rounded-xl overflow-hidden border border-primary/20 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-primary/20">
                    <div className="aspect-square w-full overflow-hidden bg-secondary/20 relative cursor-pointer" onClick={() => setSelectedImage(nft.imageURI)}>
                        {nft.imageURI ? (
                            <img
                                src={nft.imageURI}
                                alt={`Eternal #${nft.id}`}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No Image Data
                            </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                            <span className="text-white font-bold text-lg">#{nft.id}</span>
                            <div className="text-xs text-primary mt-1 underline">Ver Original</div>
                        </div>
                    </div>

                    <div className="p-3 border-t border-white/5 flex justify-between items-center bg-card/50">
                        <span className="text-xs font-mono text-muted-foreground">ID: {nft.id}</span>
                        <a
                            href={`https://sepolia.etherscan.io/tx/${nft.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                        >
                            Tx <span className="text-[10px] ml-0.5">↗</span>
                        </a>
                    </div>
                </div>
            ))}

            {/* Lightbox Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
                        <button
                            className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors z-10"
                            onClick={() => setSelectedImage(null)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                        <img
                            src={selectedImage}
                            alt="Full Screen View"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="mt-4 flex gap-4">
                            <a
                                href={selectedImage}
                                download="eternal-nft.webp"
                                onClick={(e) => e.stopPropagation()}
                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                {t('gallery.download')}
                            </a>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(selectedImage);
                                    const btn = e.currentTarget;
                                    const originalText = t('gallery.copy'); // Keep original text ref
                                    btn.innerText = t('gallery.copied');
                                    setTimeout(() => btn.innerText = originalText, 2000);
                                }}
                                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full text-sm font-medium transition-colors flex items-center gap-2 border border-white/10"
                            >
                                {t('gallery.copy')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
