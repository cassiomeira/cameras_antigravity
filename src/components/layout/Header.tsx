import { Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export function Header() {
    const { user, logout } = useAuth();
    const { logoBase64 } = useTheme();

    return (
        <header className="bg-primary text-white shadow-lg">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    {/* Espaço para Logomarca */}
                    {logoBase64 ? (
                        <div className="h-10 w-32 flex items-center justify-center bg-white rounded cursor-help" title="Logomarca da Empresa">
                            <img src={logoBase64} alt="Company Logo" className="max-h-8 max-w-[110px] object-contain" />
                        </div>
                    ) : (
                        <div className="h-10 w-32 flex items-center justify-center bg-white/10 rounded border border-white/20 border-dashed cursor-help" title="Espaço para logomarca da empresa">
                            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest text-center leading-tight">Sua<br />Logo</span>
                        </div>
                    )}
                    <div className="w-px h-6 bg-white/20 mx-2"></div>
                    <h1 className="text-xl font-bold tracking-tight">CâmeraERP Pro</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Bell className="w-6 h-6 cursor-pointer hover:text-accent transition-colors" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                            3
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 pl-2 border-l border-white/20">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold shadow-inner uppercase">
                            {user?.company_name?.[0] || <User className="w-6 h-6" />}
                        </div>
                        <div className="hidden md:block">
                            <p className="font-semibold text-sm leading-tight max-w-[150px] truncate" title={user?.company_name}>
                                {user?.company_name || 'Usuário'}
                            </p>
                            <p className="text-xs text-white/70 max-w-[150px] truncate" title={user?.email}>
                                {user?.email || 'carregando...'}
                            </p>
                        </div>
                        <button
                            onClick={logout}
                            title="Sair"
                            className="ml-2 p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
