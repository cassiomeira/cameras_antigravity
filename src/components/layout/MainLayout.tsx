import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useEffect } from 'react';
import { loadEmpresasFromDB } from '../../services/ixcApi';


export function MainLayout() {
    useEffect(() => {
        // Inicializa as empresas e a empresa ativa no localStorage a partir do SQLite
        loadEmpresasFromDB().catch(console.error);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 p-6 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>

        </div>
    );
}
