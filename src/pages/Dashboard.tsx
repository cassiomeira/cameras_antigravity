import { DollarSign, Users, FileText, Video, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';
import { dbGetStats } from '../services/db';

const COLORS = ['#3b82f6', '#ef4444', '#eab308'];

export function Dashboard() {
    const [stats, setStats] = useState({
        empresas: 0,
        clientes_sync: 0,
        equipamentos: 0,
        receita_recorrente: 0,
        receita_avulsa: 0,
        contratos_ativos: 0,
        contratos_cancelados: 0,
        contratos_suspensos: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dbGetStats().then(s => {
            setStats({
                empresas: s.empresas || 0,
                clientes_sync: s.clientes_sync || 0,
                equipamentos: s.equipamentos || 0,
                receita_recorrente: s.receita_recorrente || 0,
                receita_avulsa: s.receita_avulsa || 0,
                contratos_ativos: s.contratos_ativos || 0,
                contratos_cancelados: s.contratos_cancelados || 0,
                contratos_suspensos: s.contratos_suspensos || 0,
            });
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const dataRevenue = [
        { name: 'Recorrente', value: stats.receita_recorrente },
        { name: 'Avulsa', value: stats.receita_avulsa },
    ];

    const dataContracts = [
        { name: 'Ativos', value: stats.contratos_ativos },
        { name: 'Cancelados', value: stats.contratos_cancelados },
        { name: 'Suspensos', value: stats.contratos_suspensos },
    ];

    const totalRevenue = stats.receita_recorrente + stats.receita_avulsa;

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-dark">Dashboard</h2>
                <p className="text-gray-600">Visão geral do sistema</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-500 text-sm">Receita Mensal</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-500 text-sm">Clientes IXC</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.clientes_sync.toLocaleString('pt-BR')}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-500 text-sm">Contratos Ativos</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.contratos_ativos.toLocaleString('pt-BR')}
                            </p>
                        </div>
                        <div className="p-3 bg-primary/20 rounded-full">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-500 text-sm">Equipamentos ISP</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.equipamentos.toLocaleString('pt-BR')}
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-full">
                            <Video className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Receita Recorrente vs Avulsa</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataRevenue}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value: any) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Status dos Contratos</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataContracts}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {dataContracts.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
