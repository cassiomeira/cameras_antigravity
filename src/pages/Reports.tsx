import { Download, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const dataRevenueByClient = [
    { name: 'Empresa ABC', value: 12000 },
    { name: 'João Silva', value: 8500 },
    { name: 'Comércio XYZ', value: 7200 },
    { name: 'Construtora 123', value: 6800 },
    { name: 'Hotéis Brasil', value: 5500 },
];

const dataEquipment = [
    { name: 'Câmeras IP', value: 240 },
    { name: 'DVRs', value: 45 },
    { name: 'NVRs', value: 40 },
    { name: 'Cabos', value: 1200 },
    { name: 'Acessórios', value: 320 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export function Reports() {
    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-dark">Relatórios</h2>
                <p className="text-gray-600">Análises e relatórios</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Receita por Cliente</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataRevenueByClient} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} />
                                <Tooltip formatter={(value) => `R$ ${value}`} />
                                <Bar dataKey="value" fill="#60a5fa" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Equipamentos por Tipo</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataEquipment}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                                >
                                    {dataEquipment.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Relatórios Disponíveis</h3>
                    <button className="bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm flex items-center transition-colors">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar Todos
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relatório</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formato</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-900">Receita Mensal</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">Set/2023</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">PDF, Excel</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex space-x-3">
                                    <button className="text-blue-600 hover:text-blue-900 flex items-center"><Download className="w-4 h-4 mr-1" /> PDF</button>
                                    <button className="text-green-600 hover:text-green-900 flex items-center"><FileSpreadsheet className="w-4 h-4 mr-1" /> Excel</button>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-900">Clientes Ativos</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">Até hoje</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">PDF, Excel</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex space-x-3">
                                    <button className="text-blue-600 hover:text-blue-900 flex items-center"><Download className="w-4 h-4 mr-1" /> PDF</button>
                                    <button className="text-green-600 hover:text-green-900 flex items-center"><FileSpreadsheet className="w-4 h-4 mr-1" /> Excel</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
