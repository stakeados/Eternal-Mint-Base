'use client';

import { useI18n } from '@/lib/i18n';

export function LanguageSelector() {
    const { language, setLanguage } = useI18n();

    return (
        <div className="flex gap-2 text-sm font-medium">
            <button
                onClick={() => setLanguage('es')}
                className={`px-3 py-1 rounded-full transition-colors ${language === 'es'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                    }`}
            >
                ES
            </button>
            <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-full transition-colors ${language === 'en'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                    }`}
            >
                EN
            </button>
        </div>
    );
}
