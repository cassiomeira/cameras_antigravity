import { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Search, Truck, Phone, Mail, MapPin } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { dbGetFornecedores, dbSaveFornecedor, dbUpdateFornecedor, dbDeleteFornecedor, type DBFornecedor } from '../services/db';

const EMPTY_FORM = { nome: '', contato: '', telefone: '', email: '', endereco: '', observacao: '' };

export function Fornecedores() {
    const [fornecedores, setFornecedores] = useState<DBFornecedor[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<DBFornecedor | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [search, setSearch] = useState('');

    const loadData = async () => {
        const data = await dbGetFornecedores();
        setFornecedores(data);
    };

    useEffect(() => { loadData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editing) {
            await dbUpdateFornecedor(editing.id, form);
        } else {
            await dbSaveFornecedor(form);
        }
        setIsModalOpen(false);
        loadData();
    };

    const handleDelete = async (id: number) => {
        if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
            await dbDeleteFornecedor(id);
            loadData();
        }
    };

    const openNew = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setIsModalOpen(true);
    };

    const openEdit = (f: DBFornecedor) => {
        setEditing(f);
        setForm({ nome: f.nome, contato: f.contato, telefone: f.telefone, email: f.email, endereco: f.endereco, observacao: f.observacao });
        setIsModalOpen(true);
    };

    const filtered = fornecedores.filter(f =>
        f.nome.toLowerCase().includes(search.toLowerCase()) ||
        f.contato.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Truck className="w-7 h-7 text-primary" />
                        Fornecedores
                    </h1>
                    <p className="text-gray-500 mt-1">Cadastro de fornecedores e parceiros de compras</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-sm text-gray-500 font-medium uppercase">Total Cadastrados</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">{fornecedores.length}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-sm text-gray-500 font-medium uppercase">Com Telefone</div>
                    <div className="text-3xl font-bold text-green-600 mt-1">{fornecedores.filter(f => f.telefone).length}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-sm text-gray-500 font-medium uppercase">Com Email</div>
                    <div className="text-3xl font-bold text-blue-600 mt-1">{fornecedores.filter(f => f.email).length}</div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar fornecedor..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary focus:border-primary w-64"
                        />
                    </div>
                    <button onClick={openNew} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm flex items-center transition-colors">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Fornecedor
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {filtered.map(f => (
                                <tr key={f.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{f.nome}</div>
                                        {f.endereco && <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{f.endereco}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{f.contato || '—'}</td>
                                    <td className="px-6 py-4">
                                        {f.telefone ? (
                                            <span className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3" />{f.telefone}</span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {f.email ? (
                                            <span className="flex items-center gap-1 text-gray-600"><Mail className="w-3 h-3" />{f.email}</span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <button onClick={() => openEdit(f)} className="text-primary hover:text-primary/70 mr-3" title="Editar">
                                            <Edit className="w-4 h-4 inline" />
                                        </button>
                                        <button onClick={() => handleDelete(f.id)} className="text-red-600 hover:text-red-900" title="Excluir">
                                            <Trash className="w-4 h-4 inline" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        {fornecedores.length === 0 ? 'Nenhum fornecedor cadastrado ainda.' : 'Nenhum resultado encontrado.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome / Razão Social *</label>
                        <input
                            required
                            value={form.nome}
                            onChange={e => setForm({ ...form, nome: e.target.value })}
                            placeholder="Ex: Distribuidora Camera Express"
                            className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Pessoa de Contato</label>
                            <input
                                value={form.contato}
                                onChange={e => setForm({ ...form, contato: e.target.value })}
                                placeholder="Nome do vendedor"
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Telefone</label>
                            <input
                                value={form.telefone}
                                onChange={e => setForm({ ...form, telefone: e.target.value })}
                                placeholder="(XX) XXXXX-XXXX"
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                placeholder="vendas@empresa.com"
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Endereço</label>
                            <input
                                value={form.endereco}
                                onChange={e => setForm({ ...form, endereco: e.target.value })}
                                placeholder="Cidade / UF"
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Observações</label>
                        <textarea
                            value={form.observacao}
                            onChange={e => setForm({ ...form, observacao: e.target.value })}
                            placeholder="Prazo de entrega, condições de pagamento, etc."
                            rows={2}
                            className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">Cancelar</button>
                        <button type="submit" className="px-6 py-2 text-sm text-white bg-primary hover:bg-primary/90 rounded-md transition-colors">Salvar</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
