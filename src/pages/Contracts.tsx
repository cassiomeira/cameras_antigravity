import { useState } from 'react';
import { Plus, Edit, Users } from 'lucide-react';
import { useData, Contract } from '../contexts/DataContext';
import { Modal } from '../components/ui/Modal';

export function Contracts() {
    const { contracts, addContract, updateContract, clients } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);

    const [formData, setFormData] = useState({
        clientId: 0,
        clientName: '', // Helper
        type: 'Aluguel Mensal',
        start: '',
        value: '',
        status: 'Ativo' as Contract['status']
    });

    // Metrics
    const activeContracts = contracts.filter(c => c.status === 'Ativo').length;
    const suspendedContracts = contracts.filter(c => c.status === 'Suspenso').length;
    const canceledContracts = contracts.filter(c => c.status === 'Cancelado').length;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedClient = clients.find(c => c.id === Number(formData.clientId));
        const clientName = selectedClient ? selectedClient.name : 'Desconhecido';

        if (editingContract) {
            updateContract(editingContract.id, { ...formData, clientName });
        } else {
            addContract({ ...formData, clientName, clientId: Number(formData.clientId) });
        }
        closeModal();
    };

    const openNewModal = () => {
        setEditingContract(null);
        setFormData({ clientId: clients[0]?.id || 0, clientName: '', type: 'Aluguel Mensal', start: '', value: '', status: 'Ativo' });
        setIsModalOpen(true);
    };

    const openEditModal = (contract: Contract) => {
        setEditingContract(contract);
        setFormData({
            clientId: contract.clientId,
            clientName: contract.clientName,
            type: contract.type,
            start: contract.start,
            value: contract.value,
            status: contract.status
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingContract(null);
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-dark">Contratos</h2>
                <p className="text-gray-600">Gestão de contratos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Status dos Contratos</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Ativos</span>
                            <span className="font-semibold text-gray-900">{activeContracts}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Suspensos</span>
                            <span className="font-semibold text-gray-900">{suspendedContracts}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Cancelados</span>
                            <span className="font-semibold text-gray-900">{canceledContracts}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Contratos Recentes</h3>
                        <button
                            onClick={openNewModal}
                            className="bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm flex items-center transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Contrato
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Início</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                {contracts.map((contract) => (
                                    <tr key={contract.id}>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{contract.clientName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{contract.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{contract.start}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{contract.value}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${contract.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                                                contract.status === 'Suspenso' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {contract.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <button onClick={() => openEditModal(contract)} className="text-blue-600 hover:text-blue-900"><Edit className="w-4 h-4" /></button>
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
                title={editingContract ? 'Editar Contrato' : 'Novo Contrato'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cliente</label>
                        <div className="flex gap-2 mt-1">
                            <select
                                value={formData.clientId}
                                onChange={(e) => setFormData({ ...formData, clientId: Number(e.target.value) })}
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm"
                            >
                                <option value={0}>Selecione um cliente local...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    const q = prompt('Digite o nome do cliente sincronizado (IXC):');
                                    if (q) {
                                        import('../services/db').then(async ({ dbGetClientes }) => {
                                            const empresa = (await import('../services/ixcApi')).getEmpresaAtiva();
                                            if (!empresa) return alert('Configure uma empresa nas configurações.');
                                            const res = await dbGetClientes(empresa.id, { q, rp: 5 });
                                            if (res.total > 0) {
                                                const sel = res.registros[0];
                                                if (confirm(`Vincular a "${sel.razao}"?`)) {
                                                    setFormData({ ...formData, clientName: sel.razao, clientId: -1 }); // -1 indicates IXC client
                                                    // In a real scenario, we'd add this client to the ERP database or handle string IDs
                                                    alert('Cliente IXC selecionado: ' + sel.razao);
                                                }
                                            } else {
                                                alert('Nenhum cliente encontrado no banco local.');
                                            }
                                        });
                                    }
                                }}
                                className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-xs hover:bg-blue-100 transition-colors"
                            >
                                Buscar no IXC
                            </button>
                        </div>
                        {formData.clientId === -1 && (
                            <p className="mt-1 text-xs text-blue-600 font-medium flex items-center gap-1">
                                <Users className="w-3 h-3" /> Vinculado ao cliente IXC: {formData.clientName}
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Contrato</label>
                            <input
                                type="text"
                                required
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                placeholder="Ex: Aluguel, Manutenção"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Data Início</label>
                            <input
                                type="date"
                                required
                                value={formData.start}
                                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Valor</label>
                        <input
                            type="text"
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            placeholder="Ex: R$ 1.200,00"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        >
                            <option value="Ativo">Ativo</option>
                            <option value="Suspenso">Suspenso</option>
                            <option value="Concluído">Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">Salvar</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
