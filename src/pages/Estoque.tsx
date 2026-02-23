import { useState, useEffect, useMemo } from 'react';
import { Package, Plus, AlertTriangle, Search, Settings, Tag, Cpu, Edit, Trash, History, Loader2, ShoppingCart, ClipboardList } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useData } from '../contexts/DataContext';
import {
    dbGetEstoqueProdutos,
    dbSaveEstoqueProduto,
    dbUpdateEstoqueProduto,
    dbDeleteEstoqueProduto,
    dbGetEquipamentos,
    dbSaveEquipamento,
    dbUpdateEquipamento,
    dbDeleteEquipamento,
    dbGetEquipamentoHistorico,
    dbAddEquipamentoHistorico,
    DBEstoqueProduto,
    DBEquipamento,
    DBEquipamentoHistorico,
    dbGetFornecedores,
    dbGetComprasEstoque,
    dbSaveCompraEstoque,
    DBFornecedor,
    DBCompraEstoque
} from '../services/db';
import { getEmpresaAtiva } from '../services/ixcApi';

type Tab = 'LOTES' | 'RASTREADOS';

export function Estoque() {
    const { clients } = useData();
    const [activeTab, setActiveTab] = useState<Tab>('LOTES');

    const [lotes, setLotes] = useState<DBEstoqueProduto[]>([]);
    const [rastreados, setRastreados] = useState<DBEquipamento[]>([]);
    const [loading, setLoading] = useState(true);

    const [isLoteModalOpen, setIsLoteModalOpen] = useState(false);
    const [isRastreadoModalOpen, setIsRastreadoModalOpen] = useState(false);
    const [isProvideModalOpen, setIsProvideModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [editingLote, setEditingLote] = useState<DBEstoqueProduto | null>(null);
    const [editingRastreado, setEditingRastreado] = useState<DBEquipamento | null>(null);
    const [provideTarget, setProvideTarget] = useState<DBEstoqueProduto | null>(null);
    const [historyTarget, setHistoryTarget] = useState<DBEquipamento | null>(null);
    const [historyLogs, setHistoryLogs] = useState<DBEquipamentoHistorico[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [formLote, setFormLote] = useState({ categoria: 'Roteadores', modelo: '', estoque_minimo: 5, quantidade: 0, valor_total: '' });
    const [formRastreado, setFormRastreado] = useState({ categoria: 'Roteadores', modelo: '', serial_number: '', mac: '', status: 'Em Estoque', preco_custo: '', observacao: '' });
    const [formProvide, setFormProvide] = useState({ clientId: '', sn: '', mac: '', observacao: '', quantidade: 1, valor_mensal: '' });

    // --- Entrada de Estoque (Compras) ---
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [entryTarget, setEntryTarget] = useState<DBEstoqueProduto | null>(null);
    const [formEntry, setFormEntry] = useState({ fornecedor_id: '', fornecedor_nome: '', quantidade: 0, valor_total: '', nota_fiscal: '', observacao: '' });
    const [fornecedores, setFornecedores] = useState<DBFornecedor[]>([]);
    const [isPurchaseHistoryOpen, setIsPurchaseHistoryOpen] = useState(false);
    const [purchaseHistoryTarget, setPurchaseHistoryTarget] = useState<DBEstoqueProduto | null>(null);
    const [purchaseHistory, setPurchaseHistory] = useState<DBCompraEstoque[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [l, r] = await Promise.all([
                dbGetEstoqueProdutos(),
                dbGetEquipamentos()
            ]);
            setLotes(l);
            setRastreados(r);
        } catch (error) {
            console.error('Failed to load inventory', error);
        } finally {
            setLoading(false);
        }
    };

    const loadFornecedores = async () => {
        try {
            const data = await dbGetFornecedores();
            setFornecedores(data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        loadData();
        loadFornecedores();
    }, []);

    // ── Categorias dinâmicas ──
    const BASE_CATEGORIES = ['Roteadores', 'ONUs', 'Switches', 'Rádios', 'TV Box', 'Câmeras', 'Cabos', 'Conectores', 'Outros'];
    const allCategories = useMemo(() => {
        const fromDB = new Set<string>();
        lotes.forEach(l => fromDB.add(l.categoria));
        rastreados.forEach(r => fromDB.add(r.categoria));
        BASE_CATEGORIES.forEach(c => fromDB.add(c));
        return [...fromDB].sort();
    }, [lotes, rastreados]);

    const handleCategorySelect = (
        value: string,
        setter: (cat: string) => void
    ) => {
        if (value === '__NOVA__') {
            const nova = prompt('Digite o nome da nova categoria:');
            if (nova && nova.trim()) {
                setter(nova.trim());
            }
        } else {
            setter(value);
        }
    };

    // --- Lotes (estoque_produtos) ---
    const handleLoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const emp = getEmpresaAtiva();
        if (editingLote) {
            await dbUpdateEstoqueProduto(editingLote.id, { empresa_id: emp?.id || '', ...formLote });
        } else {
            await dbSaveEstoqueProduto({ empresa_id: emp?.id || '', ...formLote });
        }
        setIsLoteModalOpen(false);
        loadData();
    };

    const handleDeleteLote = async (id: number) => {
        if (confirm('Deseja realmente excluir este produto do catálogo?')) {
            await dbDeleteEstoqueProduto(id);
            loadData();
        }
    };

    const openNewLote = () => {
        setEditingLote(null);
        setFormLote({ categoria: 'Roteadores', modelo: '', estoque_minimo: 5, quantidade: 0, valor_total: '' });
        setIsLoteModalOpen(true);
    };

    const openEditLote = (item: DBEstoqueProduto) => {
        setEditingLote(item);
        setFormLote({ categoria: item.categoria, modelo: item.modelo, estoque_minimo: item.estoque_minimo, quantidade: item.quantidade, valor_total: item.valor_total || '' });
        setIsLoteModalOpen(true);
    };

    // --- Rastreados (equipamentos) ---
    const handleRastreadoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingRastreado) {
            await dbUpdateEquipamento(editingRastreado.id, {
                ...formRastreado,
                ixc_cliente_id: editingRastreado.ixc_cliente_id,
                ixc_cliente_nome: editingRastreado.ixc_cliente_nome,
                valor_mensal: editingRastreado.valor_mensal || '',
                ixc_id_externo: editingRastreado.ixc_id_externo || ''
            });
            await dbAddEquipamentoHistorico(editingRastreado.id, {
                acao: `Edição Manual (Status: ${formRastreado.status})`,
                cliente_id: editingRastreado.ixc_cliente_id,
                cliente_nome: editingRastreado.ixc_cliente_nome,
                observacao: formRastreado.observacao || 'Atualizado via cadastro manual'
            });
        } else {
            const res = await dbSaveEquipamento({
                ...formRastreado,
                ixc_cliente_id: null,
                ixc_cliente_nome: null,
                valor_mensal: '',
                ixc_id_externo: ''
            });
            await dbAddEquipamentoHistorico(res.id, {
                acao: 'Cadastrado no Estoque',
                cliente_id: null,
                cliente_nome: null,
                observacao: formRastreado.observacao || 'Cadastro Inicial'
            });
        }
        setIsRastreadoModalOpen(false);
        loadData();
    };

    const handleDeleteRastreado = async (id: number) => {
        if (confirm('Deseja excluir este equipamento? O histórico também será excluído.')) {
            await dbDeleteEquipamento(id);
            loadData();
        }
    };

    const openNewRastreado = () => {
        setEditingRastreado(null);
        setFormRastreado({ categoria: 'Roteadores', modelo: '', serial_number: '', mac: '', status: 'Em Estoque', preco_custo: '', observacao: '' });
        setIsRastreadoModalOpen(true);
    };

    const openEditRastreado = (item: DBEquipamento) => {
        setEditingRastreado(item);
        setFormRastreado({
            categoria: item.categoria,
            modelo: item.modelo,
            serial_number: item.serial_number,
            mac: item.mac,
            status: item.status,
            preco_custo: item.preco_custo || '',
            observacao: item.observacao || ''
        });
        setIsRastreadoModalOpen(true);
    };

    const openHistory = async (item: DBEquipamento) => {
        setHistoryTarget(item);
        setIsHistoryModalOpen(true);
        setLoadingHistory(true);
        try {
            const logs = await dbGetEquipamentoHistorico(item.id);
            setHistoryLogs(logs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // --- Provide to Client ---
    const openProvideModal = (lote: DBEstoqueProduto) => {
        setProvideTarget(lote);
        setFormProvide({ clientId: '', sn: '', mac: '', observacao: '', quantidade: 1, valor_mensal: '' });
        setIsProvideModalOpen(true);
    };

    const handleProvideSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!provideTarget || !formProvide.clientId) return;

        const client = clients.find(c => c.id === Number(formProvide.clientId));
        if (!client) return;
        const qty = formProvide.quantidade || 1;

        if (provideTarget.quantidade >= qty) {
            // Buscar IXC ID real do cliente
            let ixcIdExterno = '';
            try {
                const lookupRes = await fetch(`/db/clientes/buscar-ixc-id?nome=${encodeURIComponent(client.name)}`);
                const lookupData = await lookupRes.json();
                if (lookupData.id) ixcIdExterno = String(lookupData.id);
            } catch (err) { console.warn('Falha ao buscar IXC ID:', err); }

            // Deduct quantity from stock
            await dbUpdateEstoqueProduto(provideTarget.id, {
                ...provideTarget,
                quantidade: provideTarget.quantidade - qty
            });
            // Create N tracked items
            for (let i = 0; i < qty; i++) {
                const res = await dbSaveEquipamento({
                    categoria: provideTarget.categoria,
                    modelo: provideTarget.modelo,
                    serial_number: qty === 1 ? formProvide.sn : (formProvide.sn ? `${formProvide.sn}-${i + 1}` : ''),
                    mac: qty === 1 ? formProvide.mac : (formProvide.mac ? `${formProvide.mac}-${i + 1}` : ''),
                    status: 'No Cliente',
                    ixc_cliente_id: String(client.id),
                    ixc_cliente_nome: client.name,
                    preco_custo: '',
                    valor_mensal: formProvide.valor_mensal || '',
                    ixc_id_externo: ixcIdExterno,
                    observacao: formProvide.observacao
                });
                await dbAddEquipamentoHistorico(res.id, {
                    acao: 'Fornecido ao Cliente',
                    cliente_id: String(client.id),
                    cliente_nome: client.name,
                    observacao: formProvide.observacao || `Saída de ${qty} un. via Estoque`
                });
            }

            setIsProvideModalOpen(false);
            loadData();
        } else {
            alert(`Sem estoque suficiente! Disponível: ${provideTarget.quantidade}, Solicitado: ${qty}`);
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-dark flex items-center">
                        <Package className="w-6 h-6 mr-3 text-primary" />
                        Controle de Estoque
                    </h2>
                    <p className="text-gray-600 mt-1">Gestão unificada de lotes, produtos e equipamentos com número de série.</p>
                </div>
            </div>

            {/* Dashboard Mini */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Tipos de Produtos</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{lotes.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Tag className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Alertas de Reposição</p>
                        <p className="text-3xl font-bold text-red-600 mt-1">
                            {lotes.filter(l => l.quantidade <= l.estoque_minimo).length}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Itens Rastreados (Seriais)</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{rastreados.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Cpu className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('LOTES')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'LOTES'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Visão Geral e Lotes
                    </button>
                    <button
                        onClick={() => setActiveTab('RASTREADOS')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'RASTREADOS'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Equipamentos Rastreados (S/N)
                    </button>
                </nav>
            </div>

            {/* Tab: LOTES */}
            {activeTab === 'LOTES' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <div className="relative w-64">
                            <input
                                type="text"
                                placeholder="Buscar produtos..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        </div>
                        <button onClick={openNewLote} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm flex items-center transition-colors">
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Produto / Lote
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-gray-500">Carregando estoque...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria / Produto</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. Disponível</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Unit.</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                    {lotes.map((lote) => {
                                        // Somar a quantidade do lote com as unidades rastreadas que voltaram e estão 'Em Estoque'
                                        const rastreadosLivres = rastreados.filter(r => r.modelo === lote.modelo && r.status === 'Em Estoque').length;
                                        const totalAvailable = lote.quantidade + rastreadosLivres;

                                        const alert = totalAvailable <= lote.estoque_minimo;
                                        return (
                                            <tr key={lote.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{lote.modelo}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{lote.categoria}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {totalAvailable}
                                                    </span>
                                                    {rastreadosLivres > 0 ? (
                                                        <div className="text-xs text-gray-400 mt-0.5" title="Soma do lote fechado + aparelhos rastreados retornados">
                                                            ({lote.quantidade} em caixa + {rastreadosLivres} avulso{rastreadosLivres > 1 ? 's' : ''})
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-400 mt-0.5">Min: {lote.estoque_minimo}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {(() => {
                                                        const valorTotal = parseFloat(lote.valor_total || '0');
                                                        const valorUnit = totalAvailable > 0 ? valorTotal / totalAvailable : 0;
                                                        return valorTotal > 0 ? (
                                                            <div>
                                                                <span className="text-sm font-semibold text-green-700">R$ {valorUnit.toFixed(2)}</span>
                                                                <div className="text-xs text-gray-400">Total: R$ {valorTotal.toFixed(2)}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">—</span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {alert ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Estoque Baixo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            Estoque OK
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <button onClick={() => { setEntryTarget(lote); setFormEntry({ fornecedor_id: '', fornecedor_nome: '', quantidade: 0, valor_total: '', nota_fiscal: '', observacao: '' }); setIsEntryModalOpen(true); }} className="text-blue-600 hover:text-blue-800 mr-2 font-medium bg-blue-50 px-2 py-1 rounded-md text-xs" title="Registrar nova compra/entrada">
                                                        <ShoppingCart className="w-3.5 h-3.5 inline mr-1" />Entrada
                                                    </button>
                                                    <button onClick={async () => { setPurchaseHistoryTarget(lote); const h = await dbGetComprasEstoque(lote.id); setPurchaseHistory(h); setIsPurchaseHistoryOpen(true); }} className="text-primary hover:text-primary-text mr-2" title="Histórico de Compras">
                                                        <ClipboardList className="w-4 h-4 inline" />
                                                    </button>
                                                    <button onClick={() => openProvideModal(lote)} className="text-green-600 hover:text-green-800 mr-2 font-medium bg-green-50 px-2 py-1 rounded-md text-xs" title="Fornecer ao Cliente">
                                                        Fornecer
                                                    </button>
                                                    <button onClick={() => openEditLote(lote)} className="text-primary hover:text-primary/70 mr-3" title="Alterar Quantidades">
                                                        <Settings className="w-4 h-4 inline" />
                                                    </button>
                                                    <button onClick={() => handleDeleteLote(lote.id)} className="text-red-600 hover:text-red-900" title="Excluir">
                                                        <Trash className="w-4 h-4 inline" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {lotes.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                Nenhum produto cadastrado no controle unificado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )
            }

            {/* Tab: RASTREADOS */}
            {
                activeTab === 'RASTREADOS' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <div className="relative w-64">
                                <input
                                    type="text"
                                    placeholder="Buscar por MAC ou S/N..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            </div>
                            <button onClick={openNewRastreado} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm flex items-center transition-colors shadow-sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Cadastrar Rastreado
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-gray-500">Carregando equipamentos...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identificação</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S/N - MAC</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Custo</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local/Cliente</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                        {rastreados.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{item.modelo}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{item.categoria}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-600 space-y-1">
                                                    <div><span className="text-gray-400 inline-block w-8">SN:</span> {item.serial_number || 'Sem SN'}</div>
                                                    <div><span className="text-gray-400 inline-block w-8">MAC:</span> {item.mac || 'Sem MAC'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-green-700 font-medium">
                                                    {item.preco_custo ? `R$ ${item.preco_custo}` : '—'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'Em Estoque' ? 'bg-green-100 text-green-800' :
                                                        item.status === 'No Cliente' ? 'bg-blue-100 text-blue-800' :
                                                            item.status === 'Danificado' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-sm">
                                                    {item.ixc_cliente_nome ? (
                                                        <span className="text-blue-600 font-medium cursor-pointer hover:underline">
                                                            {item.ixc_cliente_nome}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">Na base</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <button onClick={() => openHistory(item)} className="text-blue-600 hover:text-blue-800 mr-3" title="Ver Histórico">
                                                        <History className="w-4 h-4 inline" />
                                                    </button>
                                                    <button onClick={() => openEditRastreado(item)} className="text-primary hover:text-primary/70 mr-3" title="Editar">
                                                        <Edit className="w-4 h-4 inline" />
                                                    </button>
                                                    <button onClick={() => handleDeleteRastreado(item.id)} className="text-red-600 hover:text-red-900" title="Excluir">
                                                        <Trash className="w-4 h-4 inline" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {rastreados.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                    Nenhum equipamento rastreado cadastrado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Modal de LOTES */}
            <Modal isOpen={isLoteModalOpen} onClose={() => setIsLoteModalOpen(false)} title={editingLote ? 'Editar Estoque' : 'Novo Produto para Estoque'}>
                <form onSubmit={handleLoteSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Categoria</label>
                            <select
                                title="Categoria do Lote"
                                value={formLote.categoria}
                                onChange={e => handleCategorySelect(e.target.value, (v) => setFormLote({ ...formLote, categoria: v }))}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:ring-primary focus:border-primary"
                            >
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                                <option value="__NOVA__">+ Nova Categoria...</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Modelo / Nome do Produto</label>
                            <input
                                title="Modelo ou Nome do Produto"
                                required
                                value={formLote.modelo}
                                onChange={e => setFormLote({ ...formLote, modelo: e.target.value })}
                                placeholder="Ex: Roteador TP-Link Archer C80"
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quantidade Atual</label>
                            <input
                                title="Quantidade Atual Disponível"
                                type="number"
                                required
                                min="0"
                                value={formLote.quantidade}
                                onChange={e => setFormLote({ ...formLote, quantidade: parseInt(e.target.value) || 0 })}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:ring-primary focus:border-primary text-xl font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Alerta: Estoque Mínimo</label>
                            <input
                                title="Quantidade para Estoque Mínimo"
                                type="number"
                                required
                                min="0"
                                value={formLote.estoque_minimo}
                                onChange={e => setFormLote({ ...formLote, estoque_minimo: parseInt(e.target.value) || 0 })}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg border border-green-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Valor Total do Lote (R$)</label>
                            <input
                                title="Valor Total de Aquisição do Lote"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formLote.valor_total}
                                onChange={e => setFormLote({ ...formLote, valor_total: e.target.value })}
                                placeholder="Ex: 7500.00"
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Valor Unitário (Calculado)</label>
                            <div className="mt-1 block w-full rounded-md bg-gray-100 border border-gray-200 p-2 text-lg font-bold text-green-700">
                                {formLote.quantidade > 0 && parseFloat(formLote.valor_total || '0') > 0
                                    ? `R$ ${(parseFloat(formLote.valor_total) / formLote.quantidade).toFixed(2)}`
                                    : 'R$ 0,00'
                                }
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={() => setIsLoteModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">Cancelar</button>
                        <button type="submit" className="px-6 py-2 text-sm text-white bg-primary hover:bg-primary/90 rounded-md transition-colors">Salvar Alterações</button>
                    </div>
                </form>
            </Modal>

            {/* Modal de RASTREADOS */}
            <Modal isOpen={isRastreadoModalOpen} onClose={() => setIsRastreadoModalOpen(false)} title={editingRastreado ? 'Editar Equipamento' : 'Novo Equipamento (Rastreado)'}>
                <form onSubmit={handleRastreadoSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Categoria</label>
                            <select
                                title="Categoria do Equipamento Rastreado"
                                value={formRastreado.categoria}
                                onChange={e => handleCategorySelect(e.target.value, (v) => setFormRastreado({ ...formRastreado, categoria: v }))}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            >
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                                <option value="__NOVA__">+ Nova Categoria...</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Modelo</label>
                            <input
                                title="Modelo do Equipamento Rastreado"
                                required
                                value={formRastreado.modelo}
                                onChange={e => setFormRastreado({ ...formRastreado, modelo: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Serial Number (S/N)</label>
                            <input
                                title="Número de Série"
                                value={formRastreado.serial_number}
                                onChange={e => setFormRastreado({ ...formRastreado, serial_number: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2 font-mono text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Endereço MAC</label>
                            <input
                                title="Endereço MAC"
                                value={formRastreado.mac}
                                onChange={e => setFormRastreado({ ...formRastreado, mac: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2 font-mono text-sm"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                title="Status do Equipamento"
                                value={formRastreado.status}
                                onChange={e => setFormRastreado({ ...formRastreado, status: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            >
                                <option value="Em Estoque">Em Estoque</option>
                                <option value="No Cliente">No Cliente</option>
                                <option value="Em Manutenção">Em Manutenção</option>
                                <option value="Danificado">Danificado</option>
                                <option value="Descartado">Descartado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Preço de Custo (R$)</label>
                            <input
                                title="Preço de Custo"
                                placeholder="Ex: 150,00"
                                value={formRastreado.preco_custo}
                                onChange={e => setFormRastreado({ ...formRastreado, preco_custo: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Observações</label>
                        <input
                            title="Observações sobre o Equipamento"
                            value={formRastreado.observacao}
                            onChange={e => setFormRastreado({ ...formRastreado, observacao: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setIsRastreadoModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancelar</button>
                        <button type="submit" className="px-6 py-2 text-sm text-white bg-primary hover:bg-primary/90 rounded-md transition-colors">Salvar</button>
                    </div>
                </form>
            </Modal>

            {/* Modal FORNECER AO CLIENTE */}
            <Modal isOpen={isProvideModalOpen} onClose={() => setIsProvideModalOpen(false)} title="Fornecer Equipamento ao Cliente">
                {provideTarget && (
                    <form onSubmit={handleProvideSubmit} className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-blue-800">{provideTarget.modelo}</p>
                                <p className="text-xs text-blue-600">{provideTarget.categoria}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-blue-600">Em Estoque</p>
                                <p className="text-sm font-bold text-blue-800">{provideTarget.quantidade} un.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Selecione o Cliente</label>
                            {formProvide.clientId ? (
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="inline-flex items-center px-3 py-2 rounded-md bg-green-100 text-green-800 font-medium text-sm flex-1">
                                        ✅ {clients.find(c => c.id === Number(formProvide.clientId))?.name || 'Cliente'}
                                    </span>
                                    <button type="button" onClick={() => setFormProvide({ ...formProvide, clientId: '' })} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 bg-red-50 rounded" title="Trocar cliente">✕</button>
                                </div>
                            ) : (
                                <div className="mt-1 relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                                    <input
                                        type="text"
                                        placeholder="Digite para buscar o cliente..."
                                        title="Buscar cliente"
                                        id="provide-client-search"
                                        autoComplete="off"
                                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full text-sm focus:ring-primary focus:border-primary"
                                        onChange={e => {
                                            const el = document.getElementById('provide-client-list');
                                            if (el) el.dataset.filter = e.target.value.toLowerCase();
                                            el?.querySelectorAll('[data-name]').forEach((li: any) => {
                                                li.style.display = li.dataset.name.includes(e.target.value.toLowerCase()) ? '' : 'none';
                                            });
                                        }}
                                    />
                                    <ul id="provide-client-list" className="border border-gray-200 rounded-md max-h-40 overflow-y-auto mt-1 bg-white shadow-sm">
                                        {clients.map(c => (
                                            <li
                                                key={c.id}
                                                data-name={c.name.toLowerCase()}
                                                onClick={() => setFormProvide({ ...formProvide, clientId: String(c.id) })}
                                                className="px-3 py-2 text-sm hover:bg-primary/10 cursor-pointer border-b border-gray-50 last:border-0"
                                            >
                                                <span className="font-medium">{c.name}</span>
                                                {c.document && <span className="text-gray-400 text-xs ml-2">{c.document}</span>}
                                            </li>
                                        ))}
                                        {clients.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Nenhum cliente cadastrado.</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Quantidade *</label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    max={provideTarget.quantidade}
                                    title="Quantidade a fornecer"
                                    value={formProvide.quantidade}
                                    onChange={e => setFormProvide({ ...formProvide, quantidade: parseInt(e.target.value) || 1 })}
                                    className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-lg font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor Mensal / Câmera (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    title="Valor mensal por câmera"
                                    placeholder="Ex: 20.00"
                                    value={formProvide.valor_mensal}
                                    onChange={e => setFormProvide({ ...formProvide, valor_mensal: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                                />
                            </div>
                        </div>
                        {formProvide.valor_mensal && formProvide.quantidade > 0 && (
                            <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
                                <span className="text-sm text-gray-600">Receita Mensal Total: </span>
                                <span className="text-xl font-bold text-green-700">
                                    R$ {(parseFloat(formProvide.valor_mensal) * formProvide.quantidade).toFixed(2)}/mês
                                </span>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">S/N (Opcional)</label>
                                <input
                                    title="Número de Série"
                                    value={formProvide.sn}
                                    onChange={e => setFormProvide({ ...formProvide, sn: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 border p-2 font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">MAC (Opcional)</label>
                                <input
                                    title="Endereço MAC"
                                    value={formProvide.mac}
                                    onChange={e => setFormProvide({ ...formProvide, mac: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 border p-2 font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Observações de Comodato/Venda</label>
                            <input
                                title="Observações"
                                value={formProvide.observacao}
                                onChange={e => setFormProvide({ ...formProvide, observacao: e.target.value })}
                                placeholder="Ex: Equipamento em Comodato"
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            />
                        </div>
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setIsProvideModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancelar</button>
                            <button type="submit" disabled={provideTarget.quantidade < formProvide.quantidade} className="px-6 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50">
                                Confirmar Saída ({formProvide.quantidade} un.)
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal HISTÓRICO */}
            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Histórico do Equipamento">
                {historyTarget && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="font-bold text-gray-900">{historyTarget.modelo}</h4>
                            <div className="text-sm font-mono text-gray-500 mt-1 space-x-4">
                                <span>S/N: {historyTarget.serial_number || '-'}</span>
                                <span>MAC: {historyTarget.mac || '-'}</span>
                            </div>
                        </div>

                        {loadingHistory ? (
                            <div className="flex justify-center p-8 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        ) : historyLogs.length === 0 ? (
                            <div className="text-center p-8 text-gray-500">Nenhum histórico encontrado.</div>
                        ) : (
                            <div className="relative border-l border-gray-200 ml-3 space-y-6 pb-4">
                                {historyLogs.map(log => (
                                    <div key={log.id} className="relative pl-6">
                                        <div className="absolute w-3 h-3 bg-primary rounded-full -left-[6.5px] top-1 border-2 border-white ring-4 ring-primary/10"></div>
                                        <div className="text-xs text-gray-400 mb-0.5">
                                            {new Date(log.data).toLocaleString()}
                                        </div>
                                        <div className="font-semibold text-gray-900">{log.acao}</div>
                                        {log.cliente_nome && (
                                            <div className="text-sm font-medium text-blue-600 mt-0.5">
                                                Cliente: {log.cliente_nome}
                                            </div>
                                        )}
                                        {log.observacao && (
                                            <div className="text-sm text-gray-600 mt-1 italic">
                                                "{log.observacao}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Modal de ENTRADA DE ESTOQUE (Nova Compra) */}
            <Modal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} title={`Nova Entrada — ${entryTarget?.modelo || ''}`}>
                {entryTarget && (
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const valorTotal = parseFloat(formEntry.valor_total || '0');
                        const valorUnit = formEntry.quantidade > 0 ? valorTotal / formEntry.quantidade : 0;
                        await dbSaveCompraEstoque({
                            produto_id: entryTarget.id,
                            fornecedor_id: formEntry.fornecedor_id ? parseInt(formEntry.fornecedor_id) : null,
                            fornecedor_nome: formEntry.fornecedor_nome,
                            data: new Date().toISOString(),
                            quantidade: formEntry.quantidade,
                            valor_unitario: valorUnit,
                            valor_total: valorTotal,
                            nota_fiscal: formEntry.nota_fiscal,
                            observacao: formEntry.observacao
                        });
                        setIsEntryModalOpen(false);
                        loadData();
                    }} className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-sm">
                            📦 Registrando nova entrada para <strong>{entryTarget.modelo}</strong> ({entryTarget.categoria})
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Fornecedor</label>
                            <select
                                title="Fornecedor"
                                value={formEntry.fornecedor_id}
                                onChange={e => {
                                    const fId = e.target.value;
                                    const fNome = fornecedores.find(f => String(f.id) === fId)?.nome || '';
                                    setFormEntry({ ...formEntry, fornecedor_id: fId, fornecedor_nome: fNome });
                                }}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            >
                                <option value="">— Selecionar fornecedor —</option>
                                {fornecedores.map(f => (
                                    <option key={f.id} value={f.id}>{f.nome}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">Cadastre novos fornecedores na aba "Fornecedores" do menu lateral.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Quantidade Recebida *</label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    value={formEntry.quantidade || ''}
                                    onChange={e => setFormEntry({ ...formEntry, quantidade: parseInt(e.target.value) || 0 })}
                                    placeholder="Ex: 24"
                                    className="mt-1 block w-full rounded-md border-gray-300 border p-2 text-lg font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor Total da Compra (R$) *</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formEntry.valor_total}
                                    onChange={e => setFormEntry({ ...formEntry, valor_total: e.target.value })}
                                    placeholder="Ex: 3588.00"
                                    className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                                />
                            </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
                            <span className="text-sm text-gray-600">Valor Unitário Calculado: </span>
                            <span className="text-xl font-bold text-green-700">
                                {formEntry.quantidade > 0 && parseFloat(formEntry.valor_total || '0') > 0
                                    ? `R$ ${(parseFloat(formEntry.valor_total) / formEntry.quantidade).toFixed(2)}`
                                    : 'R$ 0,00'
                                }
                            </span>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nº Nota Fiscal</label>
                            <input
                                value={formEntry.nota_fiscal}
                                onChange={e => setFormEntry({ ...formEntry, nota_fiscal: e.target.value })}
                                placeholder="Ex: NF-001234"
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Observações</label>
                            <textarea
                                value={formEntry.observacao}
                                onChange={e => setFormEntry({ ...formEntry, observacao: e.target.value })}
                                placeholder="Prazo entrega, condição, etc."
                                rows={2}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            />
                        </div>
                        <div className="flex justify-end space-x-3 pt-2">
                            <button type="button" onClick={() => setIsEntryModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancelar</button>
                            <button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center">
                                <ShoppingCart className="w-4 h-4 mr-2" /> Registrar Entrada
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal de HISTÓRICO DE COMPRAS */}
            <Modal isOpen={isPurchaseHistoryOpen} onClose={() => setIsPurchaseHistoryOpen(false)} title={`Histórico de Compras — ${purchaseHistoryTarget?.modelo || ''}`}>
                {purchaseHistoryTarget && (
                    <div className="space-y-4">
                        {purchaseHistory.length === 0 ? (
                            <div className="text-center p-8 text-gray-500">Nenhuma compra registrada para este produto.</div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                                        <div className="text-xs text-blue-600 font-medium">Total Comprado</div>
                                        <div className="text-xl font-bold text-blue-800">{purchaseHistory.reduce((s, c) => s + c.quantidade, 0)} un.</div>
                                    </div>
                                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                                        <div className="text-xs text-green-600 font-medium">Valor Investido</div>
                                        <div className="text-xl font-bold text-green-800">R$ {purchaseHistory.reduce((s, c) => s + c.valor_total, 0).toFixed(2)}</div>
                                    </div>
                                    <div className="bg-primary/10 border border-purple-100 rounded-lg p-3 text-center">
                                        <div className="text-xs text-primary font-medium">Preço Médio</div>
                                        <div className="text-xl font-bold text-primary-text">
                                            {(() => {
                                                const totalQty = purchaseHistory.reduce((s, c) => s + c.quantidade, 0);
                                                const totalVal = purchaseHistory.reduce((s, c) => s + c.valor_total, 0);
                                                return totalQty > 0 ? `R$ ${(totalVal / totalQty).toFixed(2)}` : 'R$ 0,00';
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fornecedor</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Qtd</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Unit.</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Total</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">NF</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {purchaseHistory.map(c => (
                                                <tr key={c.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-gray-600">{new Date(c.data).toLocaleDateString('pt-BR')}</td>
                                                    <td className="px-4 py-2 font-medium text-gray-900">{c.fornecedor_nome || '—'}</td>
                                                    <td className="px-4 py-2 text-center font-bold">{c.quantidade}</td>
                                                    <td className="px-4 py-2 text-center text-green-700">R$ {c.valor_unitario.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-center font-semibold">R$ {c.valor_total.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-gray-500 text-xs">{c.nota_fiscal || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div >
    );
}
