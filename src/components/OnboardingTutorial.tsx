'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const STEPS = [
    {
        title: 'tutorial.hero.title',
        desc: 'tutorial.hero.desc',
        icon: '💎'
    },
    {
        title: 'step1.title',
        desc: 'step1.desc',
        icon: '🔗'
    },
    {
        title: 'step2.title',
        desc: 'step2.desc',
        icon: '🪙'
    },
    {
        title: 'step3.title',
        desc: 'step3.desc',
        icon: '🖼️'
    }
];

export function OnboardingTutorial({ forceOpen, onClose }: { forceOpen: boolean; onClose: () => void }) {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const hasSeen = localStorage.getItem('hasSeenTutorial');
        if (!hasSeen || forceOpen) {
            setIsOpen(true);
            setCurrentStep(0);
        } else {
            setIsOpen(false);
        }
    }, [forceOpen]);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        localStorage.setItem('hasSeenTutorial', 'true');
        setIsOpen(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card border border-primary text-card-foreground rounded-2xl shadow-2xl p-6 max-w-sm w-full relative animate-in zoom-in-95 duration-300">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>

                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-primary mb-2">
                        {t('tutorial.welcome')}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t('tutorial.subtitle')}</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-8 mb-8 text-center min-h-[200px] flex flex-col items-center justify-center border border-border">
                    <div className="text-6xl mb-4 animate-bounce">
                        {STEPS[currentStep].icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t(STEPS[currentStep].title)}</h3>
                    <p className="text-muted-foreground">{t(STEPS[currentStep].desc)}</p>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 w-2 rounded-full transition-colors ${i === currentStep ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        {currentStep === STEPS.length - 1 ? t('tutorial.finish') : t('tutorial.next')}
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
