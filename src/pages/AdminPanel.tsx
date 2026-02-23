import { useState, useEffect, useCallback } from 'react';
import { useAuth, getAuthToken } from '../contexts/AuthContext';
import { Shield, CheckCircle, XCircle, Trash2, Loader2, Users, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminUser {
    id: number;
    email: string;
    company_name: string;
    role: string;
    approved: number;
    created_at: string;
}

export function AdminPanel() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch('/admin/users', {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (res.ok) setUsers(await res.json());
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const action = async (url: string, method = 'PUT') => {
        await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        fetchUsers();
    };

    if (user?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-red-500 font-semibold">Acesso restrito a administradores.</p>
            </div>
        );
    }

    const pending = users.filter(u => !u.approved && u.role !== 'admin');
    const approved = users.filter(u => u.approved);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" /> Painel Administrativo
                    </h2>
                    <p className="text-gray-500 text-sm">Gerenciamento de contas e empresas</p>
                </div>
            </div>

            {/* Pending */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-amber-50 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-800">Contas Pendentes de Aprovação</h3>
                    {pending.length > 0 && (
                        <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full ml-auto">{pending.length}</span>
                    )}
                </div>
                {loading ? (
                    <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                ) : pending.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">Nenhuma conta pendente</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {pending.map(u => (
                            <div key={u.id} className="px-6 py-4 flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900">{u.company_name}</p>
                                    <p className="text-sm text-gray-500">{u.email}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Registrado em {new Date(u.created_at).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => action(`/admin/users/${u.id}/approve`)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Aprovar
                                    </button>
                                    <button
                                        onClick={() => { if (confirm('Excluir esta conta?')) action(`/admin/users/${u.id}`, 'DELETE'); }}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Approved */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-800">Empresas Ativas</h3>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full ml-auto">{approved.length}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                                <th className="px-6 py-3">Empresa</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Perfil</th>
                                <th className="px-6 py-3">Registro</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {approved.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-gray-900">{u.company_name}</td>
                                    <td className="px-6 py-3 text-gray-500">{u.email}</td>
                                    <td className="px-6 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'admin' ? 'bg-primary/20 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {u.role === 'admin' ? 'Admin' : 'Empresa'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-3 text-right">
                                        {u.id !== user?.id && (
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => action(`/admin/users/${u.id}/reject`)}
                                                    title="Suspender"
                                                    className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm(`Excluir empresa "${u.company_name}"?`)) action(`/admin/users/${u.id}`, 'DELETE'); }}
                                                    title="Excluir"
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
