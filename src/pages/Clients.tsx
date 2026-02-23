import { useState, useEffect } from 'react';
import { Edit, Trash, Plus, Users, Search, Loader2, RotateCcw } from 'lucide-react';
import { useData, Client } from '../contexts/DataContext';
import { Modal } from '../components/ui/Modal';
import { dbGetEquipamentos, dbUpdateEquipamento, DBEquipamento, dbAddEquipamentoHistorico } from '../services/db';

export function Clients() {
    const { clients, addClient, updateClient, deleteClient } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [clientToDelete, setClientToDelete] = useState<{ id: number; items: DBEquipamento[] } | null>(null);

    const [allEquips, setAllEquips] = useState<DBEquipamento[]>([]);
    const [equipToReturn, setEquipToReturn] = useState<DBEquipamento | null>(null);
    const [returnReason, setReturnReason] = useState('');

    useEffect(() => {
        const fetchEquips = async () => {
            try {
                const eqs = await dbGetEquipamentos();
                setAllEquips(eqs);
            } catch (err) {
                console.error('Error fetching equips:', err);
            }
        };
        fetchEquips();
    }, []);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importQuery, setImportQuery] = useState('');
    const [importResults, setImportResults] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [searchClient, setSearchClient] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        document: '',
        type: 'PF',
        phone: '',
        email: '',
        contracts: '0 ativos',
        monthlyFee: '',
        address: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingClient) {
            updateClient(editingClient.id, formData as any);
        } else {
            addClient(formData as any);
        }
        closeModal();
    };

    const openNewModal = () => {
        setEditingClient(null);
        setFormData({ name: '', document: '', type: 'PF', phone: '', email: '', contracts: '0 ativos', monthlyFee: '', address: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (client: Client) => {
        setEditingClient(client);
        setFormData({
            name: client.name,
            document: client.document || '',
            type: client.type,
            phone: client.phone,
            email: client.email,
            contracts: client.contracts,
            monthlyFee: client.monthlyFee || '',
            address: client.address || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const handleDelete = async (id: number) => {
        try {
            const allEquips = await dbGetEquipamentos();
            const clientEquips = allEquips.filter(e => e.ixc_cliente_id === String(id));
            if (clientEquips.length > 0) {
                setClientToDelete({ id, items: clientEquips });
            } else {
                if (confirm('Tem certeza que deseja excluir este cliente?')) {
                    deleteClient(id);
                }
            }
        } catch (error) {
            console.error(error);
            if (confirm('Tem certeza que deseja excluir este cliente?')) {
                deleteClient(id);
            }
        }
    };

    const confirmDeleteWithReturn = async (action: 'ESTOQUE' | 'MANUTENCAO') => {
        if (!clientToDelete) return;
        const newStatus = action === 'ESTOQUE' ? 'Em Estoque' : 'Em Manutenção';

        try {
            for (const eq of clientToDelete.items) {
                await dbUpdateEquipamento(eq.id, {
                    ...eq,
                    status: newStatus,
                    ixc_cliente_id: null,
                    ixc_cliente_nome: null
                });
                const { dbAddEquipamentoHistorico } = await import('../services/db');
                await dbAddEquipamentoHistorico(eq.id, {
                    acao: newStatus === 'Em Estoque' ? 'Devolvido ao Estoque' : 'Enviado para Manutenção',
                    cliente_id: String(clientToDelete.id),
                    cliente_nome: null,
                    observacao: 'Retornado após exclusão do cliente'
                });
            }
            deleteClient(clientToDelete.id);
        } catch (error) {
            console.error('Falha ao processar devolução', error);
        } finally {
            setClientToDelete(null);
        }
    };

    const handleReturnEquip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!equipToReturn || !editingClient) return;
        try {
            await dbUpdateEquipamento(equipToReturn.id, {
                ...equipToReturn,
                status: 'Em Estoque',
                ixc_cliente_id: null,
                ixc_cliente_nome: null
            });
            await dbAddEquipamentoHistorico(equipToReturn.id, {
                acao: 'Retornado ao Estoque (Recolhido)',
                cliente_id: String(editingClient.id),
                cliente_nome: editingClient.name,
                observacao: returnReason
            });

            // Atualiza o estado visual sem recarregar tudo do banco na hora
            setAllEquips(prev => prev.map(eq =>
                eq.id === equipToReturn.id
                    ? { ...eq, status: 'Em Estoque', ixc_cliente_id: null, ixc_cliente_nome: null }
                    : eq
            ));

            setEquipToReturn(null);
            setReturnReason('');
        } catch (error) {
            console.error('Falha ao devolver aparelho:', error);
            alert('Falha ao devolver aparelho. Verifique o console.');
        }
    };

    const searchIXCForImport = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsImporting(true);
        try {
            const { getEmpresaAtiva } = await import('../services/ixcApi');
            const { dbGetClientes } = await import('../services/db');
            const emp = getEmpresaAtiva();
            if (!emp) { alert('Configure a empresa primeiro.'); return; }
            const res = await dbGetClientes(emp.id, { q: importQuery, rp: 20 });
            setImportResults(res.registros);
        } catch (err) {
            console.error(err);
        } finally {
            setIsImporting(false);
        }
    };

    const handleImportChosen = async (sel: any) => {
        if (!confirm(`Deseja importar os dados completos de "${sel.razao}" para o ERP?`)) return;
        setIsImporting(true);
        try {
            const { getEmpresaAtiva, getServicosByCliente } = await import('../services/ixcApi');
            const emp = getEmpresaAtiva();
            if (emp) {
                const servicos = await getServicosByCliente(emp, sel.id);
                const ativo = servicos.find(s => s.status === 'A');
                const valDb = sel.valor_mensalidade;
                const mensalidade = ativo?.valor_contrato ? `R$ ${ativo.valor_contrato}` : (valDb ? `R$ ${valDb}` : '');

                addClient({
                    name: sel.razao,
                    document: sel.fn_cgccpf || '',
                    type: sel.tipo_pessoa === 'J' ? 'PJ' : 'PF',
                    phone: sel.fone_celular || sel.fone || '',
                    email: sel.email || '',
                    address: `${sel.endereco || ''}, ${sel.numero || ''} - ${sel.bairro || ''}, ${sel.cidade || ''}`.trim().replace(/^, | - , |^ - | - $/g, ''),
                    contracts: ativo ? '1 ativo' : '0 ativos',
                    monthlyFee: mensalidade
                });
                setIsImportModalOpen(false);
                setImportResults([]);
                setImportQuery('');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-dark">Clientes</h2>
                <p className="text-gray-600">Gestão de clientes</p>
            </div>

            {/* Revenue Stats */}
            {(() => {
                const clientIds = new Set(clients.map(c => String(c.id)));
                const eqsNoCliente = allEquips.filter(eq => eq.ixc_cliente_id && clientIds.has(eq.ixc_cliente_id));
                const totalRevenue = eqsNoCliente.reduce((s, eq) => s + (parseFloat(eq.valor_mensal || '0') || 0), 0);
                const clientsComCamera = new Set(eqsNoCliente.map(eq => eq.ixc_cliente_id)).size;
                if (eqsNoCliente.length === 0) return null;
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="text-xs text-gray-500 font-medium uppercase">Câmeras Instaladas</div>
                            <div className="text-3xl font-bold text-purple-700 mt-1">{eqsNoCliente.length}</div>
                            <div className="text-xs text-gray-400 mt-0.5">em {clientsComCamera} cliente{clientsComCamera !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="bg-white rounded-xl border border-green-200 p-5">
                            <div className="text-xs text-green-600 font-medium uppercase">📷 Receita Mensal Câmeras</div>
                            <div className="text-3xl font-bold text-green-700 mt-1">R$ {totalRevenue.toFixed(2)}</div>
                            <div className="text-xs text-gray-400 mt-0.5">média R$ {clientsComCamera > 0 ? (totalRevenue / clientsComCamera).toFixed(2) : '0,00'}/cliente</div>
                        </div>
                        <div className="bg-white rounded-xl border border-blue-200 p-5">
                            <div className="text-xs text-blue-600 font-medium uppercase">📊 Projeção Anual Câmeras</div>
                            <div className="text-3xl font-bold text-blue-700 mt-1">R$ {(totalRevenue * 12).toFixed(2)}</div>
                            <div className="text-xs text-gray-400 mt-0.5">estimativa em 12 meses</div>
                        </div>
                    </div>
                );
            })()}

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Lista de Clientes</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg text-sm flex items-center transition-colors font-medium"
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Importar do IXC
                        </button>
                        <button
                            onClick={openNewModal}
                            className="bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm flex items-center transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Cliente
                        </button>
                    </div>
                </div>
                <div className="mb-4">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente por nome, CPF/CNPJ, telefone..."
                            value={searchClient}
                            onChange={e => setSearchClient(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary focus:border-primary w-full"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endereço</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aparelhos / Receita</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensalidade</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">Nenhum cliente cadastrado.</td>
                                </tr>
                            ) : clients.filter(c => {
                                if (!searchClient.trim()) return true;
                                const q = searchClient.toLowerCase();
                                return c.name.toLowerCase().includes(q) || (c.document || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q);
                            }).map((client) => (
                                <tr key={client.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{client.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">{client.document || client.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{client.phone}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs truncate max-w-[200px]" title={client.address}>{client.address || '—'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {(() => {
                                            const cEquips = allEquips.filter(eq => eq.ixc_cliente_id === String(client.id));
                                            const cRevenue = cEquips.reduce((s, eq) => s + (parseFloat(eq.valor_mensal || '0') || 0), 0);
                                            return cEquips.length > 0 ? (
                                                <div>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary-text">
                                                        {cEquips.length} unid.
                                                    </span>
                                                    {cRevenue > 0 && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 ml-1">
                                                            R$ {cRevenue.toFixed(2)}/mês
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm">—</span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-green-700">{client.monthlyFee || '—'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex space-x-3">
                                        <button
                                            onClick={() => openEditModal(client)}
                                            className="text-primary hover:text-primary/70"
                                            title="Editar Cliente"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {/* <button className="text-green-600 hover:text-green-900"><FileText className="w-4 h-4" /></button> */}
                                        <button
                                            onClick={() => handleDelete(client.id)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Excluir Cliente"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome Completo / Razão Social</label>
                        <input
                            type="text"
                            required
                            title="Nome Completo / Razão Social"
                            placeholder="Ex: João da Silva"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo</label>
                            <select
                                value={formData.type}
                                title="Tipo de Cliente"
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            >
                                <option value="PF">Pessoa Física</option>
                                <option value="PJ">Pessoa Jurídica</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">CPF/CNPJ</label>
                            <input
                                type="text"
                                title="CPF/CNPJ"
                                placeholder="Apenas números"
                                value={formData.document}
                                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Telefone</label>
                            <input
                                type="text"
                                title="Telefone"
                                placeholder="(11) 99999-9999"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                title="Email"
                                placeholder="email@exemplo.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Endereço Completo</label>
                        <input
                            type="text"
                            title="Endereço"
                            placeholder="Rua, Número, Bairro, Cidade"
                            value={formData.address || ''}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Mensalidade</label>
                        <input
                            type="text"
                            title="Mensalidade"
                            placeholder="R$ 100,00"
                            value={formData.monthlyFee}
                            onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        />
                    </div>

                    {/* Exibe Equipamentos em Uso caso seja edição e ele possua equipamentos */}
                    {editingClient && allEquips.filter(i => i.ixc_cliente_id === String(editingClient.id)).length > 0 && (() => {
                        const clientEquips = allEquips.filter(i => i.ixc_cliente_id === String(editingClient.id));
                        const totalMensal = clientEquips.reduce((sum, eq) => sum + (parseFloat(eq.valor_mensal || '0') || 0), 0);
                        return (
                            <div className="mt-4 p-4 bg-primary/10 border border-purple-100 rounded-lg">
                                <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                    Aparelhos em Uso (Comodato)
                                </h4>
                                {totalMensal > 0 && (
                                    <div className="bg-green-100 border border-green-200 rounded-lg p-2 mb-3 text-center">
                                        <span className="text-xs text-green-700 font-medium">Receita Mensal Câmeras: </span>
                                        <span className="text-lg font-bold text-green-800">R$ {totalMensal.toFixed(2)}/mês</span>
                                    </div>
                                )}
                                <ul className="space-y-2">
                                    {clientEquips.map(item => (
                                        <li key={item.id} className="text-sm text-primary-text flex items-center justify-between bg-white px-3 py-2 rounded shadow-sm">
                                            <div className="flex-1">
                                                <span><strong>{item.categoria}</strong>: {item.modelo}</span>
                                                <span className="font-mono text-xs text-gray-500 hidden sm:inline ml-2">S/N: {item.serial_number || item.mac || 'N/A'}</span>
                                                {item.ixc_id_externo && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-blue-100 text-blue-700 ml-2" title="ID do cliente no IXC">
                                                        IXC: {item.ixc_id_externo}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-md px-2 py-1">
                                                    <span className="text-xs text-green-700 font-medium">R$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        title="Valor mensal desta câmera"
                                                        placeholder="0,00"
                                                        value={item.valor_mensal || ''}
                                                        onChange={async (e) => {
                                                            const newVal = e.target.value;
                                                            // Update local state immediately
                                                            setAllEquips(prev => prev.map(eq =>
                                                                eq.id === item.id ? { ...eq, valor_mensal: newVal } : eq
                                                            ));
                                                        }}
                                                        onBlur={async (e) => {
                                                            // Persist to DB on blur
                                                            try {
                                                                await dbUpdateEquipamento(item.id, {
                                                                    ...item,
                                                                    valor_mensal: e.target.value
                                                                });
                                                            } catch (err) { console.error(err); }
                                                        }}
                                                        className="w-16 text-sm font-semibold text-green-800 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none text-right"
                                                    />
                                                    <span className="text-xs text-green-600">/mês</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setEquipToReturn(item); setReturnReason(''); }}
                                                    className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors"
                                                    title="Devolver ao Estoque"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })()}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                        >
                            Salvar
                        </button>
                    </div>
                </form>

            </Modal>

            {/* Modal de Devolução de Equipamento Unitário */}
            <Modal isOpen={!!equipToReturn} onClose={() => setEquipToReturn(null)} title="Devolver Equipamento">
                {equipToReturn && (
                    <form onSubmit={handleReturnEquip} className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm">
                            <p>Você está devolvendo <strong>{equipToReturn.modelo}</strong> ({equipToReturn.categoria}) para o Estoque.</p>
                            <p className="mt-1 font-mono text-xs text-yellow-700">S/N: {equipToReturn.serial_number || equipToReturn.mac || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Motivo / Observação (Obrigatório)</label>
                            <textarea
                                required
                                rows={3}
                                placeholder="Ex: Cliente reclamou da qualidade, plano cancelado, etc."
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 border p-2 text-sm"
                            />
                        </div>
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-4">
                            <button
                                type="button"
                                onClick={() => setEquipToReturn(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Confirmar Devolução
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal de Exclusão com Devolução */}
            <Modal isOpen={!!clientToDelete} onClose={() => setClientToDelete(null)} title="Exclusão de Cliente e Devolução">
                {clientToDelete && (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
                            <p className="font-semibold mb-2">Atenção! Este cliente possui {clientToDelete.items.length} equipamento(s) rastreado(s).</p>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                                {clientToDelete.items.map(eq => (
                                    <li key={eq.id}>
                                        {eq.modelo} {eq.serial_number ? `(S/N: ${eq.serial_number})` : ''} - {eq.categoria}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <p className="text-gray-700 text-sm">
                            O que você deseja fazer com esses equipamentos ao excluir o cliente?
                        </p>
                        <div className="flex flex-col space-y-3 pt-2">
                            <button
                                onClick={() => confirmDeleteWithReturn('ESTOQUE')}
                                className="w-full px-4 py-3 text-left font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors"
                            >
                                <span className="block font-bold">1. Retornar ao Estoque (Disponível)</span>
                                <span className="block text-xs font-normal mt-1 opacity-80">Equipamentos em perfeitas condições para reuso imediato.</span>
                            </button>
                            <button
                                onClick={() => confirmDeleteWithReturn('MANUTENCAO')}
                                className="w-full px-4 py-3 text-left font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md transition-colors"
                            >
                                <span className="block font-bold">2. Enviar para Manutenção</span>
                                <span className="block text-xs font-normal mt-1 opacity-80">Equipamentos precisam de revisão, limpeza ou conserto.</span>
                            </button>
                            <button
                                onClick={() => setClientToDelete(null)}
                                className="w-full px-4 py-2 mt-2 text-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                Cancelar Exclusão
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de Importação IXC */}
            <Modal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); setImportResults([]); }} title="Importar Cliente do IXC">
                <form onSubmit={searchIXCForImport} className="mb-4 flex gap-2">
                    <input
                        type="text"
                        title="Buscar no IXC"
                        placeholder="Nome, CPF ou Telefone..."
                        value={importQuery}
                        onChange={e => setImportQuery(e.target.value)}
                        className="flex-1 rounded-md border-gray-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={isImporting || !importQuery.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center transition-colors"
                    >
                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                </form>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {importResults.length === 0 && importQuery && !isImporting && (
                        <p className="text-gray-500 text-sm text-center py-4">Nenhum cliente encontrado. Tente buscar na aba Clientes IXC.</p>
                    )}
                    {importResults.map(res => (
                        <div key={res.id} className="bg-white border rounded-lg p-3 flex justify-between items-center hover:border-blue-300 transition-colors">
                            <div className="flex-1 min-w-0 pr-3">
                                <p className="font-semibold text-sm text-gray-900 truncate">{res.razao}</p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate flex gap-4">
                                    <span>{res.fn_cgccpf}</span>
                                    <span>{res.fone_celular || res.fone}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => handleImportChosen(res)}
                                disabled={isImporting}
                                className="shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                            >
                                Importar
                            </button>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
