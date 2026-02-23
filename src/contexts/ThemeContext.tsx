import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dbGetSettings, dbSaveSettings } from '../services/db';
import { useAuth } from './AuthContext';

export type ThemeColor = 'purple' | 'neon-green' | 'orange' | 'blue';

interface ThemeContextType {
    themeColor: ThemeColor;
    logoBase64: string | null;
    updateThemeColor: (color: ThemeColor) => Promise<void>;
    updateLogo: (base64: string | null) => Promise<void>;
    loadingTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEMES: Record<ThemeColor, { primary: string; hover: string; light: string; text: string }> = {
    'purple': { primary: '#7c3aed', hover: '#6d28d9', light: '#ede9fe', text: '#6b21a8' }, // purple-600
    'neon-green': { primary: '#10b981', hover: '#059669', light: '#d1fae5', text: '#064e3b' }, // emerald-500
    'orange': { primary: '#f97316', hover: '#ea580c', light: '#ffedd5', text: '#7c2d12' }, // orange-500
    'blue': { primary: '#2563eb', hover: '#1d4ed8', light: '#dbeafe', text: '#1e3a8a' } // blue-600
};

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [themeColor, setThemeColor] = useState<ThemeColor>('purple');
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [loadingTheme, setLoadingTheme] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoadingTheme(false);
            return;
        }

        let isMounted = true;
        setLoadingTheme(true);

        dbGetSettings().then(settings => {
            if (!isMounted) return;
            if (settings.theme_color) {
                setThemeColor(settings.theme_color as ThemeColor);
            }
            if (settings.logo_base64) {
                setLogoBase64(settings.logo_base64);
            }
            setLoadingTheme(false);
        }).catch(() => {
            if (isMounted) setLoadingTheme(false);
        });

        return () => { isMounted = false; };
    }, [user]);

    useEffect(() => {
        // Inject CSS variables globally
        const colors = THEMES[themeColor] || THEMES['purple'];
        const root = document.documentElement;
        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-primary-hover', colors.hover);
        root.style.setProperty('--color-primary-light', colors.light);
        root.style.setProperty('--color-primary-text', colors.text);
    }, [themeColor]);

    const updateThemeColor = async (color: ThemeColor) => {
        setThemeColor(color);
        await dbSaveSettings({ theme_color: color });
    };

    const updateLogo = async (base64: string | null) => {
        setLogoBase64(base64);
        await dbSaveSettings({ logo_base64: base64 || '' });
    };

    return (
        <ThemeContext.Provider value={{ themeColor, logoBase64, updateThemeColor, updateLogo, loadingTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
}
