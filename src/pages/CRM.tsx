import { useState } from 'react';
import { Edit, Trash, Plus } from 'lucide-react';
import { useData, Lead } from '../contexts/DataContext';
import { Modal } from '../components/ui/Modal';

export function CRM() {
    const { leads, addLead, updateLead, deleteLead } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        company: '',
        phone: '',
        value: '',
        status: 'Novo Lead' as Lead['status']
    });

    // Funnel Calculations
    const leadsCount = leads.length;
    const proposalsCount = leads.filter(l => l.status === 'Proposta Enviada').length;
    const negotiationCount = leads.filter(l => l.status === 'Negociação').length;
    const closedCount = leads.filter(l => l.status === 'Fechado').length;

    // Percentages for bars (simple approximation)
    const getPercent = (count: number, total: number) => total > 0 ? (count / total) * 100 : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingLead) {
            updateLead(editingLead.id, formData);
        } else {
            addLead(formData);
        }
        closeModal();
    };

    const openNewModal = () => {
        setEditingLead(null);
        setFormData({ name: '', company: '', phone: '', value: '', status: 'Novo Lead' });
        setIsModalOpen(true);
    };

    const openEditModal = (lead: Lead) => {
        setEditingLead(lead);
        setFormData({
            name: lead.name,
            company: lead.company,
            phone: lead.phone,
            value: lead.value,
            status: lead.status
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLead(null);
    };

    const handleDelete = (id: number) => {
        if (confirm('Excluir este lead?')) {
            deleteLead(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-dark">CRM</h2>
                <p className="text-gray-600">Gestão de relacionamento com clientes</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Sales Funnel */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Funil de Vendas</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">Total Leads</span>
                                <span className="text-sm font-medium text-gray-700">{leadsCount}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">Propostas</span>
                                <span className="text-sm font-medium text-gray-700">{proposalsCount}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${getPercent(proposalsCount, leadsCount)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">Negociação</span>
                                <span className="text-sm font-medium text-gray-700">{negotiationCount}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-primary h-2 rounded-full" style={{ width: `${getPercent(negotiationCount, leadsCount)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">Fechados</span>
                                <span className="text-sm font-medium text-gray-700">{closedCount}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${getPercent(closedCount, leadsCount)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Leads */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Leads Recentes</h3>
                        <button
                            onClick={openNewModal}
                            className="bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm flex items-center transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Lead
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                {leads.map((lead) => (
                                    <tr key={lead.id}>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{lead.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{lead.company}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{lead.phone}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${lead.status === 'Novo Lead' ? 'bg-blue-100 text-blue-800' :
                                                lead.status === 'Fechado' ? 'bg-green-100 text-green-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex space-x-3">
                                            <button onClick={() => openEditModal(lead)} className="text-blue-600 hover:text-blue-900"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(lead.id)} className="text-red-600 hover:text-red-900"><Trash className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingLead ? 'Editar Lead' : 'Novo Lead'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">Nome do Contato</label>
                        <button
                            type="button"
                            onClick={() => {
                                const q = prompt('Buscar contato no IXC:');
                                if (q) {
                                    import('../services/db').then(async ({ dbGetClientes }) => {
                                        const empresa = (await import('../services/ixcApi')).getEmpresaAtiva();
                                        if (!empresa) return alert('Configure uma empresa nas configurações.');
                                        const res = await dbGetClientes(empresa.id, { q, rp: 5 });
                                        if (res.total > 0) {
                                            const sel = res.registros[0];
                                            setFormData({
                                                ...formData,
                                                name: sel.razao,
                                                phone: sel.fone_celular || sel.fone || '',
                                                company: 'Cliente IXC'
                                            });
                                        } else {
                                            alert('Não encontrado.');
                                        }
                                    });
                                }
                            }}
                            className="text-[10px] text-blue-600 font-bold hover:underline"
                        >
                            Importar do IXC
                        </button>
                    </div>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Empresa</label>
                        <input
                            type="text"
                            required
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Telefone</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Valor Estimado</label>
                            <input
                                type="text"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                placeholder="Ex: R$ 5.000,00"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        >
                            <option value="Novo Lead">Novo Lead</option>
                            <option value="Proposta Enviada">Proposta Enviada</option>
                            <option value="Negociação">Negociação</option>
                            <option value="Fechado">Fechado</option>
                        </select>
                    </div>
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
        </div>
    );
}
