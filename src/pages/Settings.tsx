import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, type ThemeColor } from '../contexts/ThemeContext';

import { Save, Plus, Trash2, Wifi, WifiOff, CheckCircle, XCircle, Loader2, Eye, EyeOff, ChevronRight, RefreshCw, Users } from 'lucide-react';
import {
    loadEmpresasFromDB,
    saveEmpresaDB,
    deleteEmpresaDB,
    ativarEmpresaDB,
    getEmpresaAtiva,
    testarConexao,
    syncAllClientes,
    type IXCEmpresa,
} from '../services/ixcApi';
import { dbWipeData } from '../services/db';


// ─── Tipos locais ───────────────────────────────────────────────────────────

type StatusConexao = 'idle' | 'loading' | 'ok' | 'error';

interface EmpresaStatus {
    [id: string]: { status: StatusConexao; erro?: string };
}

// ─── Modal de Sincronização ─────────────────────────────────────────────────

interface SincronizarModalProps {
    empresa: IXCEmpresa;
    onClose: (importados: number) => void;
}

function SincronizarModal({ empresa, onClose }: SincronizarModalProps) {
    const [fetched, setFetched] = useState(0);
    const [total, setTotal] = useState(0);
    const [done, setDone] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        syncAllClientes(empresa, (f, t) => {
            setFetched(f);
            setTotal(t);
        })
            .then(total => {
                setFetched(total);
                setTotal(total);
                setDone(true);
            })
            .catch(e => setErro(e instanceof Error ? e.message : String(e)));
    }, [empresa]);

    const pct = total > 0 ? Math.round((fetched / total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Sincronizar Clientes</h3>
                        <p className="text-xs text-gray-500">{empresa.nome}</p>
                    </div>
                </div>

                {erro ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-red-700 font-medium">Erro na sincronização</p>
                        <p className="text-xs text-red-500 mt-1 font-mono">{erro}</p>
                    </div>
                ) : done ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-green-800">{fetched.toLocaleString('pt-BR')} clientes importados!</p>
                            <p className="text-xs text-green-600 mt-0.5">Dados salvos localmente para uso offline.</p>
                        </div>
                    </div>
                ) : (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-2">
                            <span>{fetched.toLocaleString('pt-BR')} de {total > 0 ? total.toLocaleString('pt-BR') : '...'} clientes</span>
                            <span>{pct}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Buscando dados do IXC...
                        </p>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={() => onClose(done ? fetched : 0)}
                        disabled={!done && !erro}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                        {done || erro ? 'Fechar' : 'Aguarde...'}
                    </button>
                </div>
            </div>
        </div>
    );
}



interface ModalEmpresaProps {
    empresa?: IXCEmpresa;
    onSave: (empresa: Omit<IXCEmpresa, 'id'>) => void;
    onClose: () => void;
}

function ModalEmpresa({ empresa, onSave, onClose }: ModalEmpresaProps) {
    const [nome, setNome] = useState(empresa?.nome ?? '');
    const [url, setUrl] = useState(empresa?.url ?? '');
    const [token, setToken] = useState(empresa?.token ?? '');
    const [showToken, setShowToken] = useState(false);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!nome.trim() || !url.trim() || !token.trim()) return;
        onSave({ nome: nome.trim(), url: url.trim().replace(/\/$/, ''), token: token.trim() });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4">
                <h3 className="text-lg font-bold text-gray-900 mb-5">
                    {empresa ? 'Editar Empresa IXC' : 'Adicionar Empresa IXC'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                        <input
                            type="text"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            placeholder="Ex: Provedor XYZ"
                            required
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL do Servidor IXC</label>
                        <input
                            type="text"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            onBlur={e => {
                                const v = e.target.value.trim();
                                if (v && !v.startsWith('http://') && !v.startsWith('https://')) {
                                    setUrl('https://' + v);
                                }
                            }}
                            placeholder="sis.netcartelecom.com.br"
                            required
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">Pode digitar sem https://, será adicionado automaticamente</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Token da API
                            <span className="ml-1 text-xs text-gray-400 font-normal">(Basic base64 ou só a chave)</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showToken ? 'text' : 'password'}
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                placeholder="Basic dXN1YXJpbzpzZW5oYQ=="
                                required
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(v => !v)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            Gere em: IXC Soft → Configurações → Webservice → Usuários de API
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function Settings() {
    const { user } = useAuth();
    const { themeColor, updateThemeColor, logoBase64, updateLogo } = useTheme();
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [empresas, setEmpresas] = useState<IXCEmpresa[]>([]);
    const [empresaAtivaId, setEmpresaAtivaId] = useState<string | null>(null);
    const [status, setStatus] = useState<EmpresaStatus>({});
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState<IXCEmpresa | undefined>(undefined);
    const [sincronizando, setSincronizando] = useState<IXCEmpresa | null>(null);
    const [syncInfo, setSyncInfo] = useState<Record<string, { total: number; data: string }>>({});
    const [profileData, setProfileData] = useState({
        company_name: user?.company_name || '',
        address: user?.address || ''
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user) {
            setProfileData({
                company_name: user.company_name,
                address: user.address || ''
            });
        }
    }, [user]);

    useEffect(() => {
        // Load empresas from SQLite DB (with localStorage cache as fallback)
        loadEmpresasFromDB().then(loaded => {
            setEmpresas(loaded);
            setEmpresaAtivaId(getEmpresaAtiva()?.id ?? null);
        });
    }, []);

    async function handleSaveProfile() {
        setIsSavingProfile(true);
        setProfileMessage(null);
        try {
            const res = await fetch('/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('camera_erp_token')}`
                },
                body: JSON.stringify(profileData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar perfil');
            setProfileMessage({ type: 'success', text: 'Perfil atualizado com sucesso! Recarregue para aplicar.' });
            // Optionally reload or update context
        } catch (err: any) {
            setProfileMessage({ type: 'error', text: err.message });
        } finally {
            setIsSavingProfile(false);
        }
    }

    async function handleSaveEmpresa(data: Omit<IXCEmpresa, 'id'>) {
        if (editando) {
            await saveEmpresaDB({ ...editando, ...data }, false);
        } else {
            const nova: IXCEmpresa = { ...data, id: Date.now().toString() };
            await saveEmpresaDB(nova, true);
        }
        const updated = await loadEmpresasFromDB();
        setEmpresas(updated);
        setEmpresaAtivaId(getEmpresaAtiva()?.id ?? null);
        setShowModal(false);
        setEditando(undefined);
    }

    async function handleDelete(id: string) {
        if (!confirm('Remover esta empresa?')) return;
        await deleteEmpresaDB(id);
        const updated = await loadEmpresasFromDB();
        setEmpresas(updated);
        setEmpresaAtivaId(getEmpresaAtiva()?.id ?? null);
    }

    async function handleAtivar(id: string) {
        await ativarEmpresaDB(id);
        const updated = await loadEmpresasFromDB();
        setEmpresas(updated);
        setEmpresaAtivaId(id);
    }

    async function handleTestarConexao(empresa: IXCEmpresa) {
        setStatus(s => ({ ...s, [empresa.id]: { status: 'loading' } }));
        const result = await testarConexao(empresa);
        setStatus(s => ({ ...s, [empresa.id]: { status: result.ok ? 'ok' : 'error', erro: result.erro } }));
    }

    function openAdd() {
        setEditando(undefined);
        setShowModal(true);
    }

    function openEdit(e: IXCEmpresa) {
        setEditando(e);
        setShowModal(true);
    }


    const statusIcon = (id: string) => {
        const s = status[id]?.status;
        if (s === 'loading') return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
        if (s === 'ok') return <CheckCircle className="w-4 h-4 text-green-500" />;
        if (s === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
                <p className="text-gray-500 text-sm">Configurações do sistema e integrações</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Perfil do Usuário ─────────────────────────── */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-base font-semibold mb-4 text-gray-800">Perfil do Usuário</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Empresa / Nome</label>
                            <input
                                type="text"
                                value={profileData.company_name}
                                onChange={e => setProfileData(p => ({ ...p, company_name: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Endereço</label>
                            <textarea
                                value={profileData.address}
                                onChange={e => setProfileData(p => ({ ...p, address: e.target.value }))}
                                rows={3}
                                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                placeholder="Avenida..., Número..., Bairro..., Cidade..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" defaultValue={user?.email || ''} readOnly className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 text-sm outline-none bg-gray-50 text-gray-500 cursor-not-allowed" />
                        </div>

                        {profileMessage && (
                            <div className={`text-xs p-2 rounded ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {profileMessage.text}
                            </div>
                        )}

                        <button
                            onClick={handleSaveProfile}
                            disabled={isSavingProfile}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg w-full flex justify-center items-center gap-2 text-sm transition-colors disabled:opacity-50"
                        >
                            {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Alterações
                        </button>
                    </div>
                </div>

                {/* ── Identidade Visual ───────────────────────────── */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-base font-semibold mb-4 text-gray-800">Identidade Visual da Empresa</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Logotipo</label>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={logoInputRef}
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = ev => updateLogo(ev.target?.result as string);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group aspect-video max-w-sm"
                                onClick={() => logoInputRef.current?.click()}
                            >
                                {logoBase64 ? (
                                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                                        <img src={logoBase64} alt="Logo" className="max-w-full max-h-full object-contain group-hover:opacity-50 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="bg-gray-900/70 text-white text-xs px-3 py-1.5 rounded-full font-medium">Trocar Imagem</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-primary transition-colors" />
                                        <p className="text-sm font-medium text-gray-600">Adicionar Logomarca</p>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG até 5MB</p>
                                    </div>
                                )}
                            </div>
                            {logoBase64 && (
                                <button
                                    onClick={() => updateLogo(null)}
                                    className="text-xs text-red-600 mt-3 font-medium hover:underline flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" /> Remover marca atual
                                </button>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Tema de Cores</label>
                            <div className="space-y-3">
                                {[
                                    { id: 'purple', label: 'Roxo Royal (Padrão)', hex: '#7c3aed' },
                                    { id: 'neon-green', label: 'Verde Neon', hex: '#10b981' },
                                    { id: 'orange', label: 'Laranja Solar', hex: '#f97316' },
                                    { id: 'blue', label: 'Azul Marinho', hex: '#2563eb' }
                                ].map(t => (
                                    <label key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${themeColor === t.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input
                                            type="radio"
                                            name="themeColor"
                                            value={t.id}
                                            checked={themeColor === t.id}
                                            onChange={() => updateThemeColor(t.id as ThemeColor)}
                                            className="w-4 h-4 text-primary focus:ring-primary"
                                        />
                                        <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: t.hex }} />
                                        <span className="text-sm font-medium text-gray-800">{t.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Configurações do Sistema ───────────────────── */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                    <h3 className="text-base font-semibold mb-4 text-gray-800">Sistema</h3>
                    <div className="space-y-5 flex-1">
                        {[
                            { label: 'Notificações por Email', desc: 'Receber alertas importantes', checked: true },
                            { label: 'Backup Automático', desc: 'Backup diário dos dados', checked: true },
                            { label: 'Modo Escuro', desc: 'Interface para pouca luz', checked: false },
                        ].map(item => (
                            <div key={item.label} className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                    <p className="text-xs text-gray-500">{item.desc}</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked={item.checked} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                                </label>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1.5">
                            <Trash2 className="w-4 h-4" /> Ações Avançadas
                        </h4>
                        <p className="text-xs text-gray-500 mb-3">Isso apagará permanentemente todos os clientes, contatos, leads e faturas da sua empresa.</p>
                        <button
                            onClick={async () => {
                                if (confirm('Tem certeza ABSOLUTA que deseja ZERAR O SISTEMA? Todos os dados da sua empresa serão apagados e essa ação não pode ser desfeita.')) {
                                    await dbWipeData();
                                    alert('Sistema zerado com sucesso!');
                                    window.location.reload();
                                }
                            }}
                            className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 px-4 py-2 flex items-center justify-center gap-2 rounded-lg w-full text-sm transition-colors font-medium">
                            Zerar Sistema
                        </button>
                    </div>
                </div>

                {/* ── Integração IXC Soft ───────────────────────── */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">Integração IXC Soft</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Gerencie seus provedores</p>
                        </div>
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-lg transition-colors font-medium"
                        >
                            <Plus className="w-3.5 h-3.5" /> Adicionar
                        </button>
                    </div>

                    {empresas.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            <Wifi className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Nenhuma empresa cadastrada</p>
                            <p className="text-xs mt-1">Clique em "+ Adicionar" para começar</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {empresas.map(emp => {
                            const isAtiva = emp.id === empresaAtivaId;
                            const st = status[emp.id] ?? { status: 'idle' as StatusConexao };
                            const s = st.status;
                            return (
                                <div
                                    key={emp.id}
                                    className={`border rounded-lg p-3 transition-all ${isAtiva ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900 truncate">{emp.nome}</span>
                                                {isAtiva && (
                                                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0">ATIVA</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate mt-0.5">{emp.url}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {statusIcon(emp.id)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                                        <button
                                            onClick={() => handleTestarConexao(emp)}
                                            disabled={s === 'loading'}
                                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded-md hover:bg-white transition-colors disabled:opacity-50"
                                        >
                                            {s === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <WifiOff className="w-3 h-3" />}
                                            Testar
                                        </button>
                                        <button
                                            onClick={() => setSincronizando(emp)}
                                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-green-300 text-green-700 rounded-md hover:bg-green-50 transition-colors"
                                            title="Importar todos os clientes do IXC para o sistema local"
                                        >
                                            <RefreshCw className="w-3 h-3" /> Sincronizar
                                        </button>
                                        {!isAtiva && (
                                            <button
                                                onClick={() => handleAtivar(emp.id)}
                                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                                            >
                                                <ChevronRight className="w-3 h-3" /> Ativar
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openEdit(emp)}
                                            className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-md hover:bg-white transition-colors"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(emp.id)}
                                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                            title="Remover empresa"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    {syncInfo[emp.id] && (
                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {syncInfo[emp.id].total.toLocaleString('pt-BR')} clientes sincronizados em {new Date(syncInfo[emp.id].data).toLocaleString('pt-BR')}
                                        </p>
                                    )}

                                    {s === 'ok' && (
                                        <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Conexão bem-sucedida!
                                        </p>
                                    )}
                                    {s === 'error' && (
                                        <div className="mt-1.5">
                                            <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                                                <XCircle className="w-3 h-3 shrink-0" /> Falha na conexão
                                            </p>
                                            {st.erro && (
                                                <p className="text-xs text-red-500 mt-0.5 ml-4 font-mono break-all">
                                                    {st.erro}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {showModal && (
                <ModalEmpresa
                    empresa={editando}
                    onSave={handleSaveEmpresa}
                    onClose={() => { setShowModal(false); setEditando(undefined); }}
                />
            )}
            {sincronizando && (
                <SincronizarModal
                    empresa={sincronizando}
                    onClose={(importados) => {
                        if (importados > 0) {
                            setSyncInfo(prev => ({
                                ...prev,
                                [sincronizando.id]: { total: importados, data: new Date().toISOString() },
                            }));
                        }
                        setSincronizando(null);
                    }}
                />
            )}
        </div>
    );
}
