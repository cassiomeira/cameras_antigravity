import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, UserPlus, Loader2, Camera } from 'lucide-react';

export function Login() {
    const { login, register } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (mode === 'register') {
            if (password !== confirmPassword) {
                setError('As senhas não coincidem');
                return;
            }
            if (password.length < 6) {
                setError('A senha deve ter pelo menos 6 caracteres');
                return;
            }
            if (!companyName.trim()) {
                setError('Informe o nome da empresa');
                return;
            }
        }

        setLoading(true);
        try {
            if (mode === 'login') {
                const result = await login(email, password);
                if (!result.ok) setError(result.error || 'Erro ao fazer login');
            } else {
                const result = await register(email, password, companyName.trim());
                if (result.ok) {
                    setSuccess(result.message || 'Conta criada! Aguarde aprovação.');
                    setMode('login');
                    setPassword('');
                    setConfirmPassword('');
                    setCompanyName('');
                } else {
                    setError(result.error || 'Erro ao criar conta');
                }
            }
        } catch {
            setError('Erro de conexão com o servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJIMjR2LTJoMTJ6bTAtNHYySDI0di0yaDEyem0wLTR2Mkgy NHYtMmgxMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-hover to-primary shadow-lg shadow-primary/30 mb-4">
                        <Camera className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">CâmeraERP Pro</h1>
                    <p className="text-purple-300/80 text-sm mt-1">Sistema de gestão para provedores de câmeras</p>
                </div>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-6">
                        {mode === 'login' ? 'Entrar na sua conta' : 'Criar nova conta'}
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm flex items-center gap-2">
                            <span className="text-base">⚠</span> {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/40 text-green-200 text-sm flex items-center gap-2">
                            <span className="text-base">✓</span> {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-1.5">Nome da Empresa</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    placeholder="Ex: Segurança Total Ltda"
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                required
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-1.5">Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={mode === 'register' ? 6 : 1}
                                    className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-1.5">Confirmar Senha</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : mode === 'login' ? (
                                <>
                                    <LogIn className="w-5 h-5" /> Entrar
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" /> Criar Conta
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
                            className="text-purple-300 hover:text-white text-sm transition-colors"
                        >
                            {mode === 'login'
                                ? 'Não tem conta? Criar nova conta'
                                : 'Já tem conta? Fazer login'
                            }
                        </button>
                    </div>
                </div>

                <p className="text-center text-purple-400/50 text-xs mt-6">© 2026 CâmeraERP Pro — Todos os direitos reservados</p>
            </div>
        </div>
    );
}
