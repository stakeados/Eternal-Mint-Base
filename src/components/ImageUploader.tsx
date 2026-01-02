'use client';

import { useCallback, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface ImageUploaderProps {
    onImageReady: (base64: string, quality: 'eternal' | 'raw') => void;
    isRestrictedEnv?: boolean; // Mobile or Smart Wallet
}

interface ProcessedImage {
    type: 'color' | 'noir' | 'pro';
    base64: string;
    sizeKB: number;
    label: string;
    description: string;
}

// --- CONFIG ---
const LIMITS = {
    color: { width: 200, targetKB: 9 },
    noir: { width: 250, targetKB: 9 },
    pro: { width: 600, targetKB: 12 },
};

// --- DITHERING HELPERS ---
const QUANT_R = 4;
const QUANT_G = 4;
const QUANT_B = 2;

const getClosestColor = (r: number, g: number, b: number, mode: 'color' | 'noir' | 'pro') => {
    if (mode === 'noir') {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const val = luminance < 128 ? 0 : 255;
        return [val, val, val];
    } else if (mode === 'color') {
        const qr = Math.floor(r * (QUANT_R - 1) / 255) * (255 / (QUANT_R - 1));
        const qg = Math.floor(g * (QUANT_G - 1) / 255) * (255 / (QUANT_G - 1));
        const qb = Math.floor(b * (QUANT_B - 1) / 255) * (255 / (QUANT_B - 1));
        return [qr, qg, qb];
    }
    return [r, g, b]; // Pro (No quantization here, handled by WebP)
};

// --- PROCESSOR CORE ---
// The "Guillotine" Loop
const compressHard = async (file: File, mode: 'color' | 'noir' | 'pro'): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);

        await new Promise((r) => (img.onload = r));

        // Start Config
        let currentWidth = LIMITS[mode].width;
        const targetKB = LIMITS[mode].targetKB;
        let attempts = 0;

        // Loop
        while (attempts < 10) {
            const canvas = document.createElement('canvas');
            const scale = currentWidth / img.width;
            canvas.width = currentWidth;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No CTX');

            // Force NO pixel smoothing for crisp look (especially on downscale)
            ctx.imageSmoothingEnabled = false;

            // Draw
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Apply Dithering (Only for Retro/Noir)
            if (mode !== 'pro') {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const w = canvas.width;

                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const i = (y * w + x) * 4;
                        const [oldR, oldG, oldB] = [data[i], data[i + 1], data[i + 2]];
                        const [newR, newG, newB] = getClosestColor(oldR, oldG, oldB, mode);

                        data[i] = newR;
                        data[i + 1] = newG;
                        data[i + 2] = newB;

                        const errR = oldR - newR;
                        const errG = oldG - newG;
                        const errB = oldB - newB;

                        const distribute = (dx: number, dy: number, f: number) => {
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < w && ny >= 0 && ny < canvas.height) {
                                const ni = (ny * w + nx) * 4;
                                data[ni] += errR * f;
                                data[ni + 1] += errG * f;
                                data[ni + 2] += errB * f;
                            }
                        };
                        distribute(1, 0, 7 / 16);
                        distribute(-1, 1, 3 / 16);
                        distribute(0, 1, 5 / 16);
                        distribute(1, 1, 1 / 16);
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            }

            // Export (Always WebP for efficiency)
            // Quality: Retro/Noir is dithered, so quality impacts artifacts but size is key.
            // Pro: needs decent look.
            const q = mode === 'noir' ? 0.7 : (mode === 'color' ? 0.7 : 0.7);
            const output = canvas.toDataURL('image/webp', q);

            // Check Size
            // Base64 length * 0.75 is approx binary size
            const sizeKB = (output.length * 0.75) / 1024;

            // console.log(`[${mode}] Attempt ${attempts + 1}: ${Math.round(currentWidth)}px -> ${sizeKB.toFixed(2)}KB (Target: ${targetKB}KB)`);

            if (sizeKB <= targetKB) {
                return resolve(output);
            }

            // Slice & Retry
            currentWidth = Math.floor(currentWidth * 0.9); // Reduce 10%
            attempts++;

            if (currentWidth < 50) break; // Safety
        }

        reject("Failed to compress within limits");
    });
};

export function ImageUploader({ onImageReady, isRestrictedEnv = false }: ImageUploaderProps) {
    const { t } = useI18n();
    const [isCompressing, setIsCompressing] = useState(false);
    const [options, setOptions] = useState<ProcessedImage[]>([]);
    const [selectedOption, setSelectedOption] = useState<ProcessedImage | null>(null);

    const handleFile = useCallback(async (file: File) => {
        setIsCompressing(true);
        setOptions([]);
        setSelectedOption(null);

        try {
            console.log("🚀 Starting GUILLOTINE Engine...");

            // Run strict compressions
            const p1 = compressHard(file, 'color').then(b64 => ({
                type: 'color' as const,
                base64: b64,
                sizeKB: Math.round((b64.length * 0.75) / 1024),
                label: 'Retro Color',
                description: 'Safe for Mobile'
            }));

            const p2 = compressHard(file, 'noir').then(b64 => ({
                type: 'noir' as const,
                base64: b64,
                sizeKB: Math.round((b64.length * 0.75) / 1024),
                label: 'Noir 1-Bit',
                description: 'Ultra Optimized'
            }));

            const promises: any[] = [p1, p2];

            if (!isRestrictedEnv) {
                const p3 = compressHard(file, 'pro').then(b64 => ({
                    type: 'pro' as const,
                    base64: b64,
                    sizeKB: Math.round((b64.length * 0.75) / 1024),
                    label: 'Original Pro',
                    description: 'Desktop Only'
                }));
                promises.push(p3);
            }

            const results = await Promise.all(promises);
            setOptions(results);
            setIsCompressing(false);

        } catch (error) {
            console.error('Processing error:', error);
            setIsCompressing(false);
            alert("Error: Image too complex/large to compress safely.");
        }
    }, [isRestrictedEnv]);

    const selectOption = (opt: ProcessedImage) => {
        setSelectedOption(opt);
        const qualityMap = opt.type === 'pro' ? 'raw' : 'eternal';
        onImageReady(opt.base64, qualityMap);
    };

    const dropHandler = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };

    if (selectedOption) {
        return (
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
                <img
                    src={selectedOption.base64}
                    alt="Selected"
                    className="max-w-full h-auto rounded-lg shadow-lg max-h-96"
                    style={{ imageRendering: 'pixelated' }}
                />
                <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-mono text-gray-500">Size: ~{selectedOption.sizeKB} KB</p>
                    <div className="flex gap-4">
                        <button onClick={() => setSelectedOption(null)} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300">Change</button>
                        <button onClick={() => { setOptions([]); setSelectedOption(null); onImageReady("", "eternal"); }} className="text-sm text-red-500 underline">{t('upload.remove')}</button>
                    </div>
                </div>
            </div>
        );
    }

    if (options.length > 0) {
        return (
            <div className="space-y-4">
                <h3 className="text-center font-bold text-gray-700 dark:text-gray-300">Select Version</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {options.map((opt) => {
                        return (
                            <div
                                key={opt.type}
                                onClick={() => selectOption(opt)}
                                className="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2 text-center hover:border-blue-500 hover:shadow-lg bg-card"
                            >
                                <img src={opt.base64} className={`w-20 h-20 object-cover rounded-md ${opt.type === 'noir' ? 'grayscale' : ''}`} style={{ imageRendering: 'pixelated' }} />
                                <div>
                                    <p className="font-bold text-sm">{opt.label}</p>
                                    <p className="text-xs text-muted-foreground">{opt.sizeKB} KB</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button onClick={() => setOptions([])} className="w-full mt-2 text-xs text-gray-400">Cancel</button>
            </div>
        );
    }

    return (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 dark:bg-zinc-900" onDrop={dropHandler} onDragOver={e => e.preventDefault()}>
            {isCompressing ? (
                <div className="space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 text-sm animate-pulse">Running Safety Loop Compression...</p>
                </div>
            ) : (
                <>
                    <PhotoIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="mb-2 text-lg font-medium">{t('upload.drop')}</p>
                    <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="inline-block mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer">{t('upload.select')}</label>
                </>
            )}
        </div>
    );
}
