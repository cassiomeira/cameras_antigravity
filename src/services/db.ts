/**
 * Frontend service layer for the local SQLite API (Express on :3001, proxied via /db)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DBEmpresa {
    id: string;
    nome: string;
    url: string;
    token: string;
    ativa: number; // 1 = active
}

export interface DBCliente {
    id: string;
    empresa_id: string;
    razao: string;
    fn_cgccpf: string;
    fone_celular: string;
    fone: string;
    email: string;
    ativo: string;
    cidade: string;
    bairro: string;
    endereco: string;
    numero: string;
    tipo_pessoa: string;
    sincronizado_em: string;
}

export interface DBEquipamento {
    id: number;
    categoria: string;
    modelo: string;
    serial_number: string;
    mac: string;
    status: string;
    ixc_cliente_id: string | null;
    ixc_cliente_nome: string | null;
    observacao: string;
    preco_custo: string;
    valor_mensal: string;
    ixc_id_externo: string;
}

export interface DBEquipamentoHistorico {
    id: number;
    equipamento_id: number;
    data: string;
    acao: string;
    cliente_id: string | null;
    cliente_nome: string | null;
    observacao: string;
}

export interface DBEstoqueProduto {
    id: number;
    empresa_id: string;
    modelo: string;
    categoria: string;
    estoque_minimo: number;
    quantidade: number;
    valor_total: string;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('camera_erp_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/db${path}`, {
        ...options,
        headers,
    });
    if (!res.ok) throw new Error(`DB API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
}

// ─── Empresas ─────────────────────────────────────────────────────────────────

export async function dbGetEmpresas(): Promise<DBEmpresa[]> {
    return apiFetch<DBEmpresa[]>('/empresas');
}

export async function dbGetEmpresaAtiva(): Promise<DBEmpresa | null> {
    return apiFetch<DBEmpresa | null>('/empresas/ativa');
}

export async function dbSaveEmpresa(empresa: Omit<DBEmpresa, 'ativa'>): Promise<void> {
    await apiFetch('/empresas', {
        method: 'POST',
        body: JSON.stringify(empresa),
    });
}

export async function dbUpdateEmpresa(id: string, data: Pick<DBEmpresa, 'nome' | 'url' | 'token'>): Promise<void> {
    await apiFetch(`/empresas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function dbAtivarEmpresa(id: string): Promise<void> {
    await apiFetch(`/empresas/${id}/ativar`, { method: 'PUT' });
}

export async function dbDeleteEmpresa(id: string): Promise<void> {
    await apiFetch(`/empresas/${id}`, { method: 'DELETE' });
}

// ─── Clientes Sync ────────────────────────────────────────────────────────────

export interface DBClientesListResult {
    total: number;
    registros: DBCliente[];
}

export async function dbGetClientes(
    empresa_id: string,
    opts: { q?: string; campo?: string; page?: number; rp?: number } = {}
): Promise<DBClientesListResult> {
    const params = new URLSearchParams({
        empresa_id,
        ...(opts.q ? { q: opts.q } : {}),
        ...(opts.campo ? { campo: opts.campo } : {}),
        page: String(opts.page ?? 1),
        rp: String(opts.rp ?? 50),
    });
    return apiFetch<DBClientesListResult>(`/clientes?${params}`);
}

export async function dbSyncClientes(empresa_id: string, registros: object[], overwrite: boolean = false): Promise<{ total: number }> {
    return apiFetch<{ total: number }>('/clientes/sync', {
        method: 'POST',
        body: JSON.stringify({ empresa_id, registros, overwrite }),
    });
}

// ─── Equipamentos ─────────────────────────────────────────────────────────────

export async function dbGetEquipamentos(): Promise<DBEquipamento[]> {
    return apiFetch<DBEquipamento[]>('/equipamentos');
}

export async function dbSaveEquipamento(eq: Omit<DBEquipamento, 'id'>): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/equipamentos', {
        method: 'POST',
        body: JSON.stringify(eq),
    });
}

export async function dbUpdateEquipamento(id: number, eq: Omit<DBEquipamento, 'id'>): Promise<void> {
    await apiFetch(`/equipamentos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(eq),
    });
}

export async function dbDeleteEquipamento(id: number): Promise<void> {
    await apiFetch(`/equipamentos/${id}`, { method: 'DELETE' });
}

export async function dbGetEquipamentoHistorico(id: number): Promise<DBEquipamentoHistorico[]> {
    return apiFetch<DBEquipamentoHistorico[]>(`/equipamentos/${id}/historico`);
}

export async function dbAddEquipamentoHistorico(id: number, log: Omit<DBEquipamentoHistorico, 'id' | 'equipamento_id' | 'data'>): Promise<void> {
    await apiFetch(`/equipamentos/${id}/historico`, {
        method: 'POST',
        body: JSON.stringify(log),
    });
}

// ─── Estoque Produtos ────────────────────────────────────────────────────────

export async function dbGetEstoqueProdutos(): Promise<DBEstoqueProduto[]> {
    return apiFetch<DBEstoqueProduto[]>('/estoque_produtos');
}

export async function dbSaveEstoqueProduto(prod: Omit<DBEstoqueProduto, 'id'>): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/estoque_produtos', {
        method: 'POST',
        body: JSON.stringify(prod),
    });
}

export async function dbUpdateEstoqueProduto(id: number, prod: Omit<DBEstoqueProduto, 'id'>): Promise<void> {
    await apiFetch(`/estoque_produtos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(prod),
    });
}

export async function dbDeleteEstoqueProduto(id: number): Promise<void> {
    await apiFetch(`/estoque_produtos/${id}`, { method: 'DELETE' });
}

export interface DBStatsResult {
    empresas: number;
    clientes_sync: number;
    equipamentos: number;
    estoque_produtos?: number;
    receita_recorrente: number;
    receita_avulsa: number;
    contratos_ativos: number;
    contratos_cancelados: number;
    contratos_suspensos: number;
}

export async function dbGetStats(): Promise<DBStatsResult> {
    return apiFetch<DBStatsResult>('/stats');
}

export async function dbWipeData(): Promise<void> {
    await apiFetch('/wipe', { method: 'POST' });
}

// ─── Settings (Theme & Logo) ──────────────────────────────────────────────────

export async function dbGetSettings(): Promise<Record<string, string>> {
    return apiFetch<Record<string, string>>('/settings');
}

export async function dbSaveSettings(settings: Record<string, string>): Promise<void> {
    await apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}

// ─── Fornecedores ─────────────────────────────────────────────────────────────

export interface DBFornecedor {
    id: number;
    nome: string;
    contato: string;
    telefone: string;
    email: string;
    endereco: string;
    observacao: string;
}

export async function dbGetFornecedores(): Promise<DBFornecedor[]> {
    return apiFetch<DBFornecedor[]>('/fornecedores');
}

export async function dbSaveFornecedor(f: Omit<DBFornecedor, 'id'>): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/fornecedores', {
        method: 'POST',
        body: JSON.stringify(f),
    });
}

export async function dbUpdateFornecedor(id: number, f: Omit<DBFornecedor, 'id'>): Promise<void> {
    await apiFetch(`/fornecedores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(f),
    });
}

export async function dbDeleteFornecedor(id: number): Promise<void> {
    await apiFetch(`/fornecedores/${id}`, { method: 'DELETE' });
}

// ─── Compras de Estoque ───────────────────────────────────────────────────────

export interface DBCompraEstoque {
    id: number;
    produto_id: number;
    fornecedor_id: number | null;
    fornecedor_nome: string;
    data: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    nota_fiscal: string;
    observacao: string;
}

export async function dbGetComprasEstoque(produtoId: number): Promise<DBCompraEstoque[]> {
    return apiFetch<DBCompraEstoque[]>(`/compras_estoque/${produtoId}`);
}

export async function dbSaveCompraEstoque(compra: Omit<DBCompraEstoque, 'id'>): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/compras_estoque', {
        method: 'POST',
        body: JSON.stringify(compra),
    });
}

export async function dbDeleteCompraEstoque(id: number): Promise<void> {
    await apiFetch(`/compras_estoque/${id}`, { method: 'DELETE' });
}

// ─── App Clients (Internal CRM) ──────────────────────────────────────────────

export interface DBAppClient {
    id: number;
    name: string;
    document: string;
    type: string;
    phone: string;
    email: string;
    address: string;
    contracts: string;
    monthlyFee: string;
}

export async function dbGetAppClients(): Promise<DBAppClient[]> {
    return apiFetch<DBAppClient[]>('/app_clients');
}

export async function dbSaveAppClient(client: Omit<DBAppClient, 'id'>): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/app_clients', {
        method: 'POST',
        body: JSON.stringify(client),
    });
}

export async function dbUpdateAppClient(id: number, client: Omit<DBAppClient, 'id'>): Promise<void> {
    await apiFetch(`/app_clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(client),
    });
}

export async function dbDeleteAppClient(id: number): Promise<void> {
    await apiFetch(`/app_clients/${id}`, { method: 'DELETE' });
}

// ─── App Contracts ────────────────────────────────────────────────────────────

export interface DBAppContract {
    id: number;
    clientId: number;
    clientName: string;
    type: string;
    start: string;
    value: string;
    status: string;
}

export async function dbGetAppContracts(): Promise<DBAppContract[]> {
    return apiFetch<DBAppContract[]>('/app_contracts');
}

export async function dbSaveAppContract(contract: Omit<DBAppContract, 'id'>): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/app_contracts', {
        method: 'POST',
        body: JSON.stringify(contract),
    });
}

export async function dbUpdateAppContract(id: number, contract: Omit<DBAppContract, 'id'>): Promise<void> {
    await apiFetch(`/app_contracts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(contract),
    });
}

export async function dbDeleteAppContract(id: number): Promise<void> {
    await apiFetch(`/app_contracts/${id}`, { method: 'DELETE' });
}

// ─── App Leads ────────────────────────────────────────────────────────────────

export interface DBAppLead {
    id: number;
    name: string;
    company: string;
    phone: string;
    status: string;
    value: string;
}

export async function dbGetAppLeads(): Promise<DBAppLead[]> {
    return apiFetch<DBAppLead[]>('/app_leads');
}

export async function dbSaveAppLead(lead: Omit<DBAppLead, 'id'>): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/app_leads', {
        method: 'POST',
        body: JSON.stringify(lead),
    });
}

export async function dbUpdateAppLead(id: number, lead: Omit<DBAppLead, 'id'>): Promise<void> {
    await apiFetch(`/app_leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(lead),
    });
}

export async function dbDeleteAppLead(id: number): Promise<void> {
    await apiFetch(`/app_leads/${id}`, { method: 'DELETE' });
}

// ─── App Invoices ─────────────────────────────────────────────────────────────

export interface DBAppInvoice {
    id: number;
    client: string;
    due: string;
    value: string;
    status: string;
}

export async function dbGetAppInvoices(): Promise<DBAppInvoice[]> {
    return apiFetch<DBAppInvoice[]>('/app_invoices');
}

export async function dbSaveAppInvoice(invoice: Omit<DBAppInvoice, 'id'>): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/app_invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
    });
}

export async function dbUpdateAppInvoice(id: number, invoice: Omit<DBAppInvoice, 'id'>): Promise<void> {
    await apiFetch(`/app_invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(invoice),
    });
}

export async function dbDeleteAppInvoice(id: number): Promise<void> {
    await apiFetch(`/app_invoices/${id}`, { method: 'DELETE' });
}
