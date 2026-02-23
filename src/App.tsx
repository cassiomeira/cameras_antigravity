import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { AdminPanel } from './pages/AdminPanel';
import { Dashboard } from './pages/Dashboard';
import { CRM } from './pages/CRM';
import { Clients } from './pages/Clients';
import { Contracts } from './pages/Contracts';
import { Estoque } from './pages/Estoque';
import { Cameras } from './pages/Cameras';
import { Financial } from './pages/Financial';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { IXCClientes } from './pages/IXCClientes';
import { Fornecedores } from './pages/Fornecedores';
import { Loader2 } from 'lucide-react';

function ProtectedRoutes() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    return (
        <DataProvider>
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="crm" element={<CRM />} />
                    <Route path="clientes" element={<Clients />} />
                    <Route path="contratos" element={<Contracts />} />
                    <Route path="estoque" element={<Estoque />} />
                    <Route path="cameras" element={<Cameras />} />
                    <Route path="financeiro" element={<Financial />} />
                    <Route path="relatorios" element={<Reports />} />
                    <Route path="configuracoes" element={<Settings />} />
                    <Route path="ixc-clientes" element={<IXCClientes />} />
                    <Route path="fornecedores" element={<Fornecedores />} />
                    <Route path="admin" element={<AdminPanel />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </DataProvider>
    );
}

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
