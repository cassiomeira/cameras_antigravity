import { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import { useData, Invoice } from '../contexts/DataContext';
import { Modal } from '../components/ui/Modal';

export function Financial() {
    const { invoices, addInvoice } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        client: '',
        due: '',
        value: '',
        status: 'Pendente' as Invoice['status']
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addInvoice(formData);
        closeModal();
    };

    const openNewModal = () => {
        setFormData({ client: '', due: '', value: '', status: 'Pendente' });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-dark">Financeiro</h2>
                <p className="text-gray-600">Gestão financeira</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Faturas Recentes</h3>
                    <button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm flex items-center transition-colors">
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Fatura
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {invoices.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{invoice.client}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{invoice.due}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{invoice.value}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${invoice.status === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex space-x-3">
                                        <button className="text-blue-600 hover:text-blue-900"><Eye className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title="Nova Fatura">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cliente</label>
                        <input type="text" required value={formData.client} onChange={(e) => setFormData({ ...formData, client: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Vencimento</label>
                        <input type="date" required value={formData.due} onChange={(e) => setFormData({ ...formData, due: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Valor</label>
                        <input type="text" required value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
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
