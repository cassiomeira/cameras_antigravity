import { BarChart2, Boxes, FileText, Home, Settings, UserCheck, Users, Video, DollarSign, Wifi, Truck, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const menuMain = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'CRM', path: '/crm' },
    { icon: UserCheck, label: 'Clientes', path: '/clientes' },
    { icon: FileText, label: 'Contratos', path: '/contratos' },
    { icon: Boxes, label: 'Estoque', path: '/estoque' },
    { icon: Video, label: 'Câmeras', path: '/cameras' },
    { icon: DollarSign, label: 'Financeiro', path: '/financeiro' },
    { icon: BarChart2, label: 'Relatórios', path: '/relatorios' },
    { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

const menuISP = [
    { icon: Wifi, label: 'Clientes IXC', path: '/ixc-clientes' }
];

const menuCompras = [
    { icon: Truck, label: 'Fornecedores', path: '/fornecedores' }
];

function MenuItem({ icon: Icon, label, path }: { icon: React.ElementType; label: string; path: string }) {
    return (
        <li>
            <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                    cn(
                        "flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200",
                        "hover:bg-primary/10 text-gray-700",
                        isActive && "bg-primary text-white hover:bg-primary/90 shadow-md"
                    )
                }
            >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
            </NavLink>
        </li>
    );
}

export function Sidebar() {
    const { user } = useAuth();

    return (
        <aside className="sidebar w-64 bg-white shadow-md h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
            <nav className="p-4">
                <ul className="space-y-1">
                    {menuMain.map(item => <MenuItem key={item.path} {...item} />)}
                </ul>

                {/* Seção Compras */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
                        Compras
                    </p>
                    <ul className="space-y-1">
                        {menuCompras.map(item => <MenuItem key={item.path} {...item} />)}
                    </ul>
                </div>

                {/* Seção Provedor */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
                        Provedor Internet
                    </p>
                    <ul className="space-y-1">
                        {menuISP.map(item => <MenuItem key={item.path} {...item} />)}
                    </ul>
                </div>

                {/* Seção Admin */}
                {user?.role === 'admin' && (
                    <div className="mt-4 pt-4 border-t border-purple-100">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest px-3 mb-2 flex items-center gap-1.5">
                            <Shield className="w-3 h-3" /> Administração
                        </p>
                        <ul className="space-y-1">
                            <MenuItem icon={Shield} label="Painel Admin" path="/admin" />
                        </ul>
                    </div>
                )}
            </nav>
        </aside>
    );
}

