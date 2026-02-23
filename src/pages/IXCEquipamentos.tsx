import { useState, useEffect } from 'react';
import {
    Package, Plus, Trash2, Search,
    Server, Wifi, AlertTriangle, CheckCircle,
    MonitorPlay, Radio, Link2, Loader2
} from 'lucide-react';
import { getEmpresaAtiva, searchClientes, type IXCCliente } from '../services/ixcApi';
import { useNavigate } from 'react-router-dom';

import { dbGetEquipamentos, dbSaveEquipamento, dbDeleteEquipamento } from '../services/db';

// Categorias de equipamento para provedores
const CATEGORIAS_ISP = ['ONU Fibra', 'Rádio Wireless', 'Switch', 'Roteador', 'OLT', 'AP', 'Cabo/Splitter', 'Outros'] as const;
type CategoriaISP = typeof CATEGORIAS_ISP[number];

const STATUS_OPTIONS = ['Em Estoque', 'Instalado', 'Em Manutenção', 'Danificado', 'Descartado'] as const;
type StatusISP = typeof STATUS_OPTIONS[number];

export interface EquipamentoISP {
    id: number;
    categoria: CategoriaISP;
    modelo: string;
    serialNumber: string;
    mac?: string;
    status: StatusISP;
    ixcClienteId?: string;
    ixcClienteNome?: string;
    observacao?: string;
}

const ICONE_CATEGORIA: Record<CategoriaISP, React.ReactNode> = {
    'ONU Fibra': <MonitorPlay className="w-4 h-4 text-blue-600" />,
    'Rádio Wireless': <Radio className="w-4 h-4 text-primary" />,
    'Switch': <Server className="w-4 h-4 text-gray-600" />,
    'Roteador': <Wifi className="w-4 h-4 text-green-600" />,
    'OLT': <Server className="w-4 h-4 text-orange-600" />,
    'AP': <Wifi className="w-4 h-4 text-teal-600" />,
    'Cabo/Splitter': <Package className="w-4 h-4 text-gray-500" />,
    'Outros': <Package className="w-4 h-4 text-gray-400" />,
};

const STATUS_COLOR: Record<StatusISP, string> = {
    'Em Estoque': 'bg-green-100 text-green-700',
    'Instalado': 'bg-blue-100 text-blue-700',
    'Em Manutenção': 'bg-amber-100 text-amber-700',
    'Danificado': 'bg-red-100 text-red-700',
    'Descartado': 'bg-gray-100 text-gray-500',
};

// ─── Modal de cadastro ───────────────────────────────────────────────────────

interface ModalNovoProps {
    onSave: (eq: Omit<EquipamentoISP, 'id'>) => void;
    onClose: () => void;
}

function ModalNovo({ onSave, onClose }: ModalNovoProps) {
    const empresa = getEmpresaAtiva();
    const [categoria, setCategoria] = useState<CategoriaISP>('ONU Fibra');
    const [modelo, setModelo] = useState('');
    const [serial, setSerial] = useState('');
    const [mac, setMac] = useState('');
    const [status, setStatus] = useState<StatusISP>('Em Estoque');
    const [obs, setObs] = useState('');
    const [buscarCliente, setBuscarCliente] = useState('');
    const [clientes, setClientes] = useState<IXCCliente[]>([]);
    const [loadingClientes, setLoadingClientes] = useState(false);
    const [clienteSelecionado, setClienteSelecionado] = useState<IXCCliente | null>(null);

    async function handleBuscarCliente() {
        if (!empresa || !buscarCliente.trim()) return;
        setLoadingClientes(true);
        try {
            // Priority: Search in local DB first, then IXC
            const { dbGetClientes } = await import('../services/db');
            const localResult = await dbGetClientes(empresa.id, { q: buscarCliente.trim(), rp: 5 });

            if (localResult.total > 0) {
                setClientes(localResult.registros.map(c => ({
                    id: c.id,
                    razao: c.razao,
                    fn_cgccpf: c.fn_cgccpf,
                    ativo: c.ativo as 'S' | 'N',
                    tipo_pessoa: c.tipo_pessoa as 'F' | 'J'
                })));
            } else {
                const result = await searchClientes(empresa, buscarCliente.trim());
                setClientes(result);
            }
        } catch { /* empty */ } finally {
            setLoadingClientes(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!modelo.trim() || !serial.trim()) return;
        onSave({
            categoria,
            modelo: modelo.trim(),
            serialNumber: serial.trim(),
            mac: mac.trim() || undefined,
            status,
            observacao: obs.trim() || undefined,
            ixcClienteId: clienteSelecionado?.id,
            ixcClienteNome: clienteSelecionado?.razao,
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-5">Novo Equipamento ISP</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                <select
                                    value={categoria}
                                    onChange={e => setCategoria(e.target.value as CategoriaISP)}
                                    title="Selecione a categoria"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {CATEGORIAS_ISP.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                                <input
                                    value={modelo}
                                    onChange={e => setModelo(e.target.value)}
                                    placeholder="Ex: Huawei HG8245H"
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nº de Série *</label>
                                <input
                                    value={serial}
                                    onChange={e => setSerial(e.target.value)}
                                    placeholder="Serial / SN"
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">MAC</label>
                                <input
                                    value={mac}
                                    onChange={e => setMac(e.target.value)}
                                    placeholder="AA:BB:CC:DD:EE:FF"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value as StatusISP)}
                                    title="Selecione o status"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                                <textarea
                                    value={obs}
                                    onChange={e => setObs(e.target.value)}
                                    rows={2}
                                    title="Observação"
                                    placeholder="Observação adicional..."
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>
                        </div>

                        {/* Vínculo com cliente IXC */}
                        {empresa && (
                            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                                    <Link2 className="w-3.5 h-3.5" /> Vincular a Cliente IXC (opcional)
                                </p>
                                {clienteSelecionado ? (
                                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{clienteSelecionado.razao}</p>
                                            <p className="text-xs text-gray-500 font-mono">{(clienteSelecionado as any).fn_cgccpf || (clienteSelecionado as any).cnpj_cpf || ''}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setClienteSelecionado(null)}
                                            className="text-xs text-red-500 hover:text-red-700"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={buscarCliente}
                                            onChange={e => setBuscarCliente(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleBuscarCliente())}
                                            placeholder="Buscar cliente no banco local/IXC..."
                                            className="flex-1 border border-gray-300 rounded-lg p-2 text-xs outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleBuscarCliente}
                                            disabled={loadingClientes}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-xs hover:bg-white transition-colors disabled:opacity-50"
                                        >
                                            {loadingClientes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                )}
                                {clientes.length > 0 && !clienteSelecionado && (
                                    <div className="mt-2 border border-gray-200 rounded-lg bg-white max-h-32 overflow-y-auto divide-y divide-gray-100">
                                        {clientes.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => { setClienteSelecionado(c); setClientes([]); }}
                                                className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                                            >
                                                <p className="text-xs font-medium text-gray-900">{c.razao}</p>
                                                <p className="text-xs text-gray-500 font-mono">{(c as any).fn_cgccpf || (c as any).cnpj_cpf || ''}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                                Cadastrar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function IXCEquipamentos() {
    const navigate = useNavigate();
    const empresa = getEmpresaAtiva();

    const [equipamentos, setEquipamentos] = useState<EquipamentoISP[]>([]);
    const [filtroCategoria, setFiltroCategoria] = useState<string>('Todos');
    const [filtroStatus, setFiltroStatus] = useState<string>('Todos');
    const [busca, setBusca] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarEquipamentos();
    }, []);

    async function carregarEquipamentos() {
        setLoading(true);
        try {
            const data = await dbGetEquipamentos();
            setEquipamentos(data.map(e => ({
                id: e.id,
                categoria: e.categoria as CategoriaISP,
                modelo: e.modelo,
                serialNumber: e.serial_number,
                mac: e.mac,
                status: e.status as StatusISP,
                ixcClienteId: e.ixc_cliente_id ?? undefined,
                ixcClienteNome: e.ixc_cliente_nome ?? undefined,
                observacao: e.observacao ?? undefined
            })));
        } catch { /* empty */ } finally {
            setLoading(false);
        }
    }

    async function handleSave(data: Omit<EquipamentoISP, 'id'>) {
        try {
            await dbSaveEquipamento({
                categoria: data.categoria,
                modelo: data.modelo,
                serial_number: data.serialNumber,
                mac: data.mac ?? '',
                status: data.status,
                ixc_cliente_id: data.ixcClienteId ?? null,
                ixc_cliente_nome: data.ixcClienteNome ?? null,
                observacao: data.observacao ?? '',
                preco_custo: '',
                valor_mensal: '',
                ixc_id_externo: ''
            });
            setShowModal(false);
            carregarEquipamentos();
        } catch (err) {
            alert('Erro ao salvar equipamento: ' + err);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Remover este equipamento?')) return;
        try {
            await dbDeleteEquipamento(id);
            carregarEquipamentos();
        } catch (err) {
            alert('Erro ao remover equipamento: ' + err);
        }
    }

    const filtrados = equipamentos.filter(eq => {
        const matchCat = filtroCategoria === 'Todos' || eq.categoria === filtroCategoria;
        const matchSt = filtroStatus === 'Todos' || eq.status === filtroStatus;
        const matchBusca = !busca || [eq.modelo, eq.serialNumber, eq.mac, eq.ixcClienteNome]
            .some(v => v?.toLowerCase().includes(busca.toLowerCase()));
        return matchCat && matchSt && matchBusca;
    });

    // Contadores por categoria
    const countPorCategoria = CATEGORIAS_ISP.reduce((acc, cat) => ({
        ...acc,
        [cat]: equipamentos.filter(e => e.categoria === cat).length,
    }), {} as Record<string, number>);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Equipamentos ISP</h2>
                    <p className="text-gray-500 text-sm mt-0.5">Estoque de equipamentos de provedor de internet</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2.5 rounded-lg transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" /> Novo Equipamento
                </button>
            </div>

            {/* Aviso sem empresa */}
            {!empresa && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm text-amber-800">Configure uma empresa IXC para vincular equipamentos a clientes.</p>
                    </div>
                    <button onClick={() => navigate('/configuracoes')} className="text-xs text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100">
                        Configurar
                    </button>
                </div>
            )}

            {/* Cards de resumo por categoria */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['ONU Fibra', 'Rádio Wireless', 'Switch', 'Roteador'] as CategoriaISP[]).map(cat => (
                    <div key={cat} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center">
                            {ICONE_CATEGORIA[cat]}
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">{countPorCategoria[cat] ?? 0}</p>
                            <p className="text-xs text-gray-500">{cat}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-40">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        placeholder="Buscar por modelo, serial, MAC..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={filtroCategoria}
                    onChange={e => setFiltroCategoria(e.target.value)}
                    title="Filtrar por categoria"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                >
                    <option>Todos</option>
                    {CATEGORIAS_ISP.map(c => <option key={c}>{c}</option>)}
                </select>
                <select
                    value={filtroStatus}
                    onChange={e => setFiltroStatus(e.target.value)}
                    title="Filtrar por status"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                >
                    <option>Todos</option>
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-2 opacity-20" />
                        <p className="text-sm">Carregando equipamentos...</p>
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-400">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">{equipamentos.length === 0 ? 'Nenhum equipamento cadastrado ainda.' : 'Nenhum resultado para os filtros aplicados.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                                    <th className="px-4 py-3">Categoria</th>
                                    <th className="px-4 py-3">Modelo / Serial</th>
                                    <th className="px-4 py-3">MAC</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Cliente IXC</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtrados.map(eq => (
                                    <tr key={eq.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {ICONE_CATEGORIA[eq.categoria]}
                                                <span className="text-xs font-medium text-gray-700">{eq.categoria}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{eq.modelo}</p>
                                            <p className="text-xs text-gray-500 font-mono">{eq.serialNumber}</p>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{eq.mac || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[eq.status]}`}>
                                                {eq.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {eq.ixcClienteNome ? (
                                                <span className="flex items-center gap-1 text-xs text-blue-700">
                                                    <CheckCircle className="w-3 h-3" /> {eq.ixcClienteNome}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">Sem vínculo</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(eq.id)}
                                                aria-label="Remover equipamento"
                                                title="Remover"
                                                className="text-red-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && <ModalNovo onSave={handleSave} onClose={() => setShowModal(false)} />}
        </div>
    );
}
