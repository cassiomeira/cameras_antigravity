import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface AuthUser {
    id: number;
    email: string;
    company_name: string;
    address?: string;
    role: 'admin' | 'user';
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
    register: (email: string, password: string, company_name: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'camera_erp_token';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
    const [loading, setLoading] = useState(true);

    // Validate existing token on mount
    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        fetch('/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => {
                if (!r.ok) throw new Error('Invalid');
                return r.json();
            })
            .then(u => {
                setUser(u);
                setLoading(false);
            })
            .catch(() => {
                localStorage.removeItem(TOKEN_KEY);
                setToken(null);
                setUser(null);
                setLoading(false);
            });
    }, [token]);

    const login = useCallback(async (email: string, password: string) => {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error };

        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
        return { ok: true };
    }, []);

    const register = useCallback(async (email: string, password: string, company_name: string) => {
        const res = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, company_name }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error };
        return { ok: true, message: data.message };
    }, []);

    const logout = useCallback(() => {
        if (token) {
            fetch('/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => { /* ignore */ });
        }
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
    }, [token]);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

/** Get the current token (for use in services like db.ts) */
export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}
