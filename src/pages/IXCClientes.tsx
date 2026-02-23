import { useState, useCallback, useEffect } from 'react';
import { Search, User, Users, Building2, Phone, Mail, Wifi, WifiOff, Loader2, ChevronDown, ChevronUp, Router as Radio, MonitorPlay, FileText, AlertTriangle, CloudDownload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    getEmpresaAtiva,
    searchClientes,
    getEquipamentosByCliente,
    type IXCCliente,
    type IXCFibraONU,
    type IXCRadioCliente,
    type IXCClienteServico,
} from '../services/ixcApi';
import { useData } from '../contexts/DataContext';

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

interface ClienteComEquipamentos extends Omit<IXCCliente, 'cnpj_cpf' | 'telefone_celular' | 'telefone_comercial'> {
    fn_cgccpf: string;
    fone_celular?: string;
    fone?: string;
    equipamentos?: {
        onus: IXCFibraONU[];
        radios: IXCRadioCliente[];
        servicos: IXCClienteServico[];
        boletos?: any[];
    };
    loadingEquip?: boolean;
    expandido?: boolean;
}

// ─── Badge de status ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'A' | 'I' | 'B' | 'S' | 'N' }) {
    const map = {
        A: { label: 'Ativo', cls: 'bg-green-100 text-green-700' },
        I: { label: 'Inativo', cls: 'bg-gray-100 text-gray-600' },
        B: { label: 'Bloqueado', cls: 'bg-red-100 text-red-700' },
        S: { label: 'Ativo', cls: 'bg-green-100 text-green-700' },
        N: { label: 'Inativo', cls: 'bg-gray-100 text-gray-600' },
    };
    const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
}

// ─── Painel de equipamentos ───────────────────────────────────────────────────

function PainelEquipamentos({ data }: { data: { onus: IXCFibraONU[]; radios: IXCRadioCliente[]; servicos: IXCClienteServico[]; boletos?: any[] } }) {
    return (
        <div className="mt-3 pt-3 border-t border-blue-100 space-y-4">
            {/* Serviços/Contratos */}
            {data.servicos.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Serviços Contratados
                    </h5>
                    <div className="space-y-1.5">
                        {data.servicos.map(s => (
                            <div key={s.id} className="flex flex-col bg-white border border-gray-100 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{s.descricao || s.produto || s.contrato || 'Serviço'}</p>
                                        {s.velocidade_download && (
                                            <p className="text-xs text-gray-500">↓ {s.velocidade_download} / ↑ {s.velocidade_upload}</p>
                                        )}
                                        {data.boletos && data.boletos.length > 0 && (
                                            <p className="text-xs font-medium text-green-600 mt-1">
                                                Mensalidade: R$ {parseFloat(data.boletos[0].valor).toFixed(2).replace('.', ',')}
                                            </p>
                                        )}
                                    </div>
                                    <StatusBadge status={s.status as 'A' | 'I' | 'B'} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ONUs Fibra */}
            {data.onus.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <MonitorPlay className="w-3.5 h-3.5" /> ONUs Fibra ({data.onus.length})
                    </h5>
                    <div className="space-y-1.5">
                        {data.onus.map(onu => (
                            <div key={onu.id} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-mono font-medium text-gray-800">{onu.numero_serie}</p>
                                        {onu.mac && <p className="text-xs text-gray-500">MAC: {onu.mac}</p>}
                                        {onu.porta_olt && <p className="text-xs text-gray-500">OLT porta {onu.porta_olt}{onu.vlan ? ` · VLAN ${onu.vlan}` : ''}</p>}
                                    </div>
                                    <StatusBadge status={onu.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Rádios Wireless */}
            {data.radios.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5" /> Rádios Wireless ({data.radios.length})
                    </h5>
                    <div className="space-y-1.5">
                        {data.radios.map(r => (
                            <div key={r.id} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{r.modelo || 'Rádio'}</p>
                                        <p className="text-xs text-gray-500 font-mono">MAC: {r.mac}</p>
                                        {r.ip && <p className="text-xs text-gray-500">IP: {r.ip}</p>}
                                    </div>
                                    <StatusBadge status={r.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.onus.length === 0 && data.radios.length === 0 && data.servicos.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">Nenhum equipamento vinculado encontrado.</p>
            )}
        </div>
    );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function IXCClientes() {
    const navigate = useNavigate();
    const { addClient } = useData();
    const empresa = getEmpresaAtiva();

    const [query, setQuery] = useState('');
    const [campo, setCampo] = useState<'razao' | 'fn_cgccpf' | 'fone_celular'>('razao');
    const [clientes, setClientes] = useState<ClienteComEquipamentos[]>([]);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [buscou, setBuscou] = useState(false);
    const [totalDB, setTotalDB] = useState<number | null>(null);
    const [modoAoVivo, setModoAoVivo] = useState(false);

    // Load from DB on startup
    useEffect(() => {
        if (!empresa?.id) return;
        carregarDoDBInicial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresa?.id]);

    async function carregarDoDBInicial() {
        setLoading(true);
        setErro(null);
        try {
            const { dbGetClientes } = await import('../services/db');
            const res = await dbGetClientes(empresa!.id, { page: 1, rp: 50 });
            if (res.total > 0) {
                setTotalDB(res.total);
                setClientes(res.registros.map(c => ({
                    id: c.id,
                    razao: c.razao,
                    fn_cgccpf: c.fn_cgccpf,
                    fone_celular: c.fone_celular,
                    fone: c.fone,
                    email: c.email,
                    ativo: c.ativo as 'S' | 'N',
                    tipo_pessoa: c.tipo_pessoa as 'F' | 'J',
                    cidade: c.cidade,
                    bairro: c.bairro,
                    endereco: c.endereco,
                    numero: c.numero,
                    expandido: false,
                })));
                setBuscou(true);
            }
        } catch {
            // DB not available yet — fallback to empty state
        } finally {
            setLoading(false);
        }
    }

    const handleSearch = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!empresa) return;
        if (!query.trim()) {
            // Empty query: reload from DB
            carregarDoDBInicial();
            return;
        }

        setLoading(true);
        setErro(null);
        setBuscou(true);

        try {
            if (modoAoVivo) {
                // Search directly on IXC API
                const resultado = await searchClientes(empresa, query.trim(), campo);
                setClientes(resultado.map(c => ({
                    ...c,
                    fn_cgccpf: c.cnpj_cpf || '',
                    fone_celular: c.telefone_celular || '',
                    fone: c.telefone_comercial || '',
                    expandido: false
                })));
            } else {
                // Search in local SQLite DB
                const { dbGetClientes } = await import('../services/db');
                const res = await dbGetClientes(empresa.id, { q: query.trim(), campo, page: 1, rp: 50 });
                setClientes(res.registros.map(c => ({
                    id: c.id,
                    razao: c.razao,
                    fn_cgccpf: c.fn_cgccpf,
                    fone_celular: c.fone_celular,
                    fone: c.fone,
                    email: c.email,
                    ativo: c.ativo as 'S' | 'N',
                    tipo_pessoa: c.tipo_pessoa as 'F' | 'J',
                    cidade: c.cidade,
                    bairro: c.bairro,
                    endereco: c.endereco,
                    numero: c.numero,
                    expandido: false,
                })));
            }
        } catch (err) {
            setErro(err instanceof Error ? err.message : 'Erro ao buscar clientes');
            setClientes([]);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresa?.id, query, campo, modoAoVivo]);

    async function handleExpandir(cliente: ClienteComEquipamentos) {
        if (!empresa) return;

        // Toggle se já carregou
        if (cliente.equipamentos) {
            setClientes(cs => cs.map(c => c.id === cliente.id ? { ...c, expandido: !c.expandido } : c));
            return;
        }

        // Marcar como carregando
        setClientes(cs => cs.map(c => c.id === cliente.id ? { ...c, loadingEquip: true, expandido: true } : c));

        try {
            const equip = await getEquipamentosByCliente(empresa, cliente.id);
            setClientes(cs => cs.map(c => c.id === cliente.id ? { ...c, loadingEquip: false, equipamentos: equip } : c));
        } catch {
            setClientes(cs => cs.map(c => c.id === cliente.id ? { ...c, loadingEquip: false } : c));
        }
    }

    async function handleImportarParaCRM(cliente: ClienteComEquipamentos) {
        if (!empresa) return;
        if (!confirm(`Deseja importar "${cliente.razao}" para a lista de Clientes (CRM)?`)) return;

        try {
            const { getServicosByCliente, getAreceberByCliente } = await import('../services/ixcApi');

            const servicos = await getServicosByCliente(empresa, cliente.id);
            const ativo = servicos.find(s => s.status === 'A');

            // Busca boletos / carnês para pegar o valor exato da cobrança em aberto
            const boletos = await getAreceberByCliente(empresa, cliente.id);
            const boletoAtivo = boletos.find(b => b.status === 'A' && b.valor);

            let mensalidade = '';
            if (boletoAtivo) {
                // Formata valor decimal "140.00" para "R$ 140,00"
                const valorUnico = parseFloat(boletoAtivo.valor).toFixed(2).replace('.', ',');
                mensalidade = `R$ ${valorUnico}`;
            } else if (ativo?.contrato) {
                // Tenta extrair do nome do contrato (fallback) ex: "ACESSO A INTERNET 140,00 REAIS 30M"
                const matchVal = ativo.contrato.match(/(\d{2,3}),(\d{2})/);
                if (matchVal) {
                    mensalidade = `R$ ${matchVal[0]}`;
                } else {
                    mensalidade = ativo.contrato;
                }
            }

            const end = cliente.endereco || ativo?.endereco || '';
            const num = cliente.numero || ativo?.numero || '';
            const bai = cliente.bairro || ativo?.bairro || '';
            const cid = cliente.cidade || ativo?.cidade || ''; // Note: cidade might be an ID in servico, but it's better than nothing

            addClient({
                name: cliente.razao,
                document: cliente.fn_cgccpf || '',
                type: cliente.tipo_pessoa === 'J' ? 'PJ' : 'PF',
                phone: cliente.fone_celular || cliente.fone || '',
                email: cliente.email || '',
                address: `${end}, ${num} - ${bai}, ${cid}`.trim().replace(/^, | - , |^ - | - |,$| - $/g, '').replace(/,\s*-\s*,/, ', '),
                contracts: ativo ? '1 ativo' : '0 ativos',
                monthlyFee: mensalidade
            });

            alert(`Cliente "${cliente.razao}" importado com sucesso! \nVerifique a aba "Clientes".`);
        } catch (err) {
            console.error(err);
            alert('Falha ao importar o cliente. Tente novamente.');
        }
    }

    // ── Sem empresa configurada ───────────────────────────────────────────────
    if (!empresa) {
        return (
            <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Nenhuma empresa IXC configurada</h3>
                    <p className="text-gray-500 text-sm mt-1">Configure uma empresa IXC na página de Configurações para buscar clientes.</p>
                </div>
                <button
                    onClick={() => navigate('/configuracoes')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                    Ir para Configurações
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Clientes IXC</h2>
                    <div className="flex flex-col gap-1 mt-1">
                        <p className="text-gray-500 text-xs flex items-center gap-1.5">
                            <Wifi className="w-3 h-3 text-green-500" />
                            <span>Empresa ativa: <strong>{empresa.nome}</strong></span>
                        </p>
                        {totalDB !== null && (
                            <p className="text-gray-500 text-xs flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-blue-500" />
                                <span><strong>{totalDB.toLocaleString('pt-BR')}</strong> clientes sincronizados localmente</span>
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setModoAoVivo(!modoAoVivo)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${modoAoVivo
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}
                        title={modoAoVivo ? "Buscando dados em tempo real no IXC" : "Buscando dados salvos no banco local"}
                    >
                        {modoAoVivo ? <Wifi className="w-3.5 h-3.5" /> : <MonitorPlay className="w-3.5 h-3.5" />}
                        {modoAoVivo ? 'Busca Ao Vivo (IXC)' : 'Busca Local (Offline)'}
                    </button>
                </div>
            </div>

            {/* Busca */}
            <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex gap-3 flex-wrap">
                    <select
                        value={campo}
                        onChange={e => setCampo(e.target.value as typeof campo)}
                        title="Campo de busca"
                        className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                        <option value="razao">Nome / Razão Social</option>
                        <option value="fn_cgccpf">CPF / CNPJ</option>
                        <option value="fone_celular">Telefone</option>
                    </select>
                    <div className="flex-1 min-w-48 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Digite para buscar..."
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Buscar
                    </button>
                </div>
            </form>

            {/* Erro */}
            {erro && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <WifiOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-700">Erro ao conectar com o IXC</p>
                        <p className="text-xs text-red-600 mt-0.5">{erro}</p>
                    </div>
                </div>
            )}

            {/* Resultados */}
            {!loading && buscou && clientes.length === 0 && !erro && (
                <div className="text-center py-12 text-gray-400">
                    <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum cliente encontrado para "{query}"</p>
                </div>
            )}

            <div className="space-y-3">
                {clientes.map(cliente => (
                    <div
                        key={cliente.id}
                        className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${cliente.expandido ? 'border-blue-200' : 'border-gray-100'}`}
                    >
                        {/* Linha principal */}
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cliente.tipo_pessoa === 'J' ? 'bg-primary/20' : 'bg-blue-100'}`}>
                                        {cliente.tipo_pessoa === 'J'
                                            ? <Building2 className="w-4 h-4 text-primary" />
                                            : <User className="w-4 h-4 text-blue-600" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-sm font-semibold text-gray-900 truncate">{cliente.razao}</h4>
                                            <StatusBadge status={cliente.ativo} />
                                            <span className="text-xs text-gray-400">{cliente.tipo_pessoa === 'J' ? 'PJ' : 'PF'}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 font-mono">{cliente.fn_cgccpf}</p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            {(cliente.fone_celular || cliente.fone) && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {cliente.fone_celular || cliente.fone}
                                                </span>
                                            )}
                                            {cliente.email && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" /> {cliente.email}
                                                </span>
                                            )}
                                            {cliente.cidade && (
                                                <span className="text-xs text-gray-400">{cliente.cidade}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0">
                                    <button
                                        onClick={() => handleImportarParaCRM(cliente)}
                                        className="flex items-center justify-center gap-1.5 text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                        title="Importar os dados deste cliente para sua lista de Clientes (CRM)"
                                    >
                                        <CloudDownload className="w-3.5 h-3.5" />
                                        Importar Cliente
                                    </button>
                                    <button
                                        onClick={() => handleExpandir(cliente)}
                                        className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        {cliente.loadingEquip
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : cliente.expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                        }
                                        {cliente.expandido ? 'Ocultar Equipamentos' : 'Ver Equipamentos'}
                                    </button>
                                </div>
                            </div>

                            {/* Painel expandido */}
                            {cliente.expandido && cliente.equipamentos && !cliente.loadingEquip && (
                                <PainelEquipamentos data={cliente.equipamentos} />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
