import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    dbGetAppClients, dbSaveAppClient, dbUpdateAppClient, dbDeleteAppClient,
    dbGetAppContracts, dbSaveAppContract, dbUpdateAppContract, dbDeleteAppContract,
    dbGetAppLeads, dbSaveAppLead, dbUpdateAppLead, dbDeleteAppLead,
    dbGetAppInvoices, dbSaveAppInvoice,
    type DBAppClient, type DBAppContract, type DBAppLead, type DBAppInvoice,
} from '../services/db';

// ─── Types (re-exported for pages) ────────────────────────────────────────────

export interface Client {
    id: number;
    name: string;
    document?: string;
    type: 'PF' | 'PJ';
    phone: string;
    email: string;
    address: string;
    contracts: string;
    monthlyFee?: string;
}

export interface Contract {
    id: number;
    clientId: number;
    clientName: string;
    type: string;
    start: string;
    value: string;
    status: 'Ativo' | 'Suspenso' | 'Cancelado' | 'Concluído';
}

export interface Lead {
    id: number;
    name: string;
    company: string;
    phone: string;
    status: 'Novo Lead' | 'Proposta Enviada' | 'Negociação' | 'Fechado';
    value: string;
}

export interface Invoice {
    id: number;
    client: string;
    due: string;
    value: string;
    status: 'Pago' | 'Pendente' | 'Atrasado';
}

interface DataContextType {
    clients: Client[];
    addClient: (client: Omit<Client, 'id'>) => Promise<void>;
    updateClient: (id: number, data: Partial<Client>) => Promise<void>;
    deleteClient: (id: number) => Promise<void>;

    contracts: Contract[];
    addContract: (contract: Omit<Contract, 'id'>) => Promise<void>;
    updateContract: (id: number, data: Partial<Contract>) => Promise<void>;
    deleteContract: (id: number) => Promise<void>;

    leads: Lead[];
    addLead: (lead: Omit<Lead, 'id'>) => Promise<void>;
    updateLead: (id: number, data: Partial<Lead>) => Promise<void>;
    deleteLead: (id: number) => Promise<void>;

    invoices: Invoice[];
    addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;

    metrics: {
        revenue: number;
        activeClients: number;
        activeContracts: number;
        equipmentCount: number;
    };

    loading: boolean;
    refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapClient(db: DBAppClient): Client {
    return {
        id: db.id,
        name: db.name,
        document: db.document || undefined,
        type: (db.type as 'PF' | 'PJ') || 'PF',
        phone: db.phone || '',
        email: db.email || '',
        address: db.address || '',
        contracts: db.contracts || '',
        monthlyFee: db.monthlyFee || undefined,
    };
}

function mapContract(db: DBAppContract): Contract {
    return {
        id: db.id,
        clientId: db.clientId,
        clientName: db.clientName || '',
        type: db.type || '',
        start: db.start || '',
        value: db.value || '',
        status: (db.status as Contract['status']) || 'Ativo',
    };
}

function mapLead(db: DBAppLead): Lead {
    return {
        id: db.id,
        name: db.name,
        company: db.company || '',
        phone: db.phone || '',
        status: (db.status as Lead['status']) || 'Novo Lead',
        value: db.value || '',
    };
}

function mapInvoice(db: DBAppInvoice): Invoice {
    return {
        id: db.id,
        client: db.client || '',
        due: db.due || '',
        value: db.value || '',
        status: (db.status as Invoice['status']) || 'Pendente',
    };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
    const [clients, setClients] = useState<Client[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Load all data from SQLite ──
    const refreshAll = useCallback(async () => {
        setLoading(true);
        try {
            // Auto-recover clients from orphaned equipment on first load
            try {
                await fetch('/db/migrate-orphan-clients', { method: 'POST' });
            } catch { /* server may not be ready yet */ }

            const [c, ct, l, i] = await Promise.all([
                dbGetAppClients(),
                dbGetAppContracts(),
                dbGetAppLeads(),
                dbGetAppInvoices(),
            ]);
            setClients(c.map(mapClient));
            setContracts(ct.map(mapContract));
            setLeads(l.map(mapLead));
            setInvoices(i.map(mapInvoice));
        } catch (err) {
            console.error('[DataContext] Falha ao carregar dados do SQLite:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    // ── Clients CRUD ──

    const addClient = useCallback(async (client: Omit<Client, 'id'>) => {
        await dbSaveAppClient({
            name: client.name,
            document: client.document || '',
            type: client.type || 'PF',
            phone: client.phone || '',
            email: client.email || '',
            address: client.address || '',
            contracts: client.contracts || '',
            monthlyFee: client.monthlyFee || '',
        });
        await refreshAll();
    }, [refreshAll]);

    const updateClient = useCallback(async (id: number, data: Partial<Client>) => {
        const existing = clients.find(c => c.id === id);
        if (!existing) return;
        const merged = { ...existing, ...data };
        await dbUpdateAppClient(id, {
            name: merged.name,
            document: merged.document || '',
            type: merged.type || 'PF',
            phone: merged.phone || '',
            email: merged.email || '',
            address: merged.address || '',
            contracts: merged.contracts || '',
            monthlyFee: merged.monthlyFee || '',
        });
        await refreshAll();
    }, [clients, refreshAll]);

    const deleteClient = useCallback(async (id: number) => {
        await dbDeleteAppClient(id);
        await refreshAll();
    }, [refreshAll]);

    // ── Contracts CRUD ──

    const addContract = useCallback(async (contract: Omit<Contract, 'id'>) => {
        await dbSaveAppContract({
            clientId: contract.clientId,
            clientName: contract.clientName,
            type: contract.type,
            start: contract.start,
            value: contract.value,
            status: contract.status,
        });
        await refreshAll();
    }, [refreshAll]);

    const updateContract = useCallback(async (id: number, data: Partial<Contract>) => {
        const existing = contracts.find(c => c.id === id);
        if (!existing) return;
        const merged = { ...existing, ...data };
        await dbUpdateAppContract(id, {
            clientId: merged.clientId,
            clientName: merged.clientName,
            type: merged.type,
            start: merged.start,
            value: merged.value,
            status: merged.status,
        });
        await refreshAll();
    }, [contracts, refreshAll]);

    const deleteContract = useCallback(async (id: number) => {
        await dbDeleteAppContract(id);
        await refreshAll();
    }, [refreshAll]);

    // ── Leads CRUD ──

    const addLead = useCallback(async (lead: Omit<Lead, 'id'>) => {
        await dbSaveAppLead({
            name: lead.name,
            company: lead.company,
            phone: lead.phone,
            status: lead.status,
            value: lead.value,
        });
        await refreshAll();
    }, [refreshAll]);

    const updateLead = useCallback(async (id: number, data: Partial<Lead>) => {
        const existing = leads.find(l => l.id === id);
        if (!existing) return;
        const merged = { ...existing, ...data };
        await dbUpdateAppLead(id, {
            name: merged.name,
            company: merged.company,
            phone: merged.phone,
            status: merged.status,
            value: merged.value,
        });
        await refreshAll();
    }, [leads, refreshAll]);

    const deleteLead = useCallback(async (id: number) => {
        await dbDeleteAppLead(id);
        await refreshAll();
    }, [refreshAll]);

    // ── Invoices CRUD ──

    const addInvoice = useCallback(async (invoice: Omit<Invoice, 'id'>) => {
        await dbSaveAppInvoice({
            client: invoice.client,
            due: invoice.due,
            value: invoice.value,
            status: invoice.status,
        });
        await refreshAll();
    }, [refreshAll]);

    // ── Metrics ──

    const metrics = {
        revenue: invoices.filter(i => i.status === 'Pago').reduce((sum, i) => {
            const val = parseFloat(i.value.replace(/[^\d,.-]/g, '').replace(',', '.'));
            return sum + (isNaN(val) ? 0 : val);
        }, 0),
        activeClients: clients.length,
        activeContracts: contracts.filter(c => c.status === 'Ativo').length,
        equipmentCount: 0, // Real value comes from /db/stats in Dashboard
    };

    return (
        <DataContext.Provider value={{
            clients, addClient, updateClient, deleteClient,
            contracts, addContract, updateContract, deleteContract,
            leads, addLead, updateLead, deleteLead,
            invoices, addInvoice,
            metrics,
            loading,
            refreshAll,
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
