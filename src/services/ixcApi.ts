// ============================================================
// IXC Soft API Service Layer
// Documentação: https://wikiapiprovedor.ixcsoft.com.br/
// ============================================================

export interface IXCEmpresa {
    id: string;
    nome: string;
    url: string;    // ex: https://erp.suaempresa.com.br
    token: string;  // ex: Basic dXNlcjpwYXNz (base64 de usuario:senha)
}

import { dbGetEmpresas, dbSaveEmpresa, dbUpdateEmpresa, dbAtivarEmpresa, dbDeleteEmpresa, dbSyncClientes, type DBEmpresa } from './db';


// ---- Config Storage (localStorage cache + SQLite persistence) ----

// localStorage keys — still used as a fast in-memory cache between DB calls
const STORAGE_KEY_EMPRESAS = 'ixc_empresas';
const STORAGE_KEY_ATIVA = 'ixc_empresa_ativa';

/** Read from localStorage cache (synchronous, for components that need it immediately) */
export function getEmpresas(): IXCEmpresa[] {
    const raw = localStorage.getItem(STORAGE_KEY_EMPRESAS);
    return raw ? JSON.parse(raw) : [];
}

/** Sync local cache from DB — call this on app start */
export async function loadEmpresasFromDB(): Promise<IXCEmpresa[]> {
    try {
        const empresas = await dbGetEmpresas();
        const mapped: IXCEmpresa[] = empresas.map(e => ({ id: e.id, nome: e.nome, url: e.url, token: e.token }));
        localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(mapped));
        const ativa = empresas.find(e => e.ativa === 1);
        if (ativa) localStorage.setItem(STORAGE_KEY_ATIVA, ativa.id);
        return mapped;
    } catch {
        // DB server not started yet — fall back to localStorage
        return getEmpresas();
    }
}

/** Save empresa to DB + update local cache */
export async function saveEmpresaDB(empresa: IXCEmpresa, isNew: boolean): Promise<void> {
    if (isNew) {
        await dbSaveEmpresa({ id: empresa.id, nome: empresa.nome, url: empresa.url, token: empresa.token, ativa: 0 } as DBEmpresa);
    } else {
        await dbUpdateEmpresa(empresa.id, { nome: empresa.nome, url: empresa.url, token: empresa.token });
    }
    // Refresh cache
    await loadEmpresasFromDB();
}

/** Delete empresa from DB + refresh cache */
export async function deleteEmpresaDB(id: string): Promise<void> {
    await dbDeleteEmpresa(id);
    await loadEmpresasFromDB();
}

/** Activate empresa in DB + refresh cache */
export async function ativarEmpresaDB(id: string): Promise<void> {
    await dbAtivarEmpresa(id);
    localStorage.setItem(STORAGE_KEY_ATIVA, id);
    // Refresh cache
    await loadEmpresasFromDB();
}

/** @deprecated Use loadEmpresasFromDB for DB-backed storage */
export function saveEmpresas(empresas: IXCEmpresa[]): void {
    localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(empresas));
}

export function getEmpresaAtiva(): IXCEmpresa | null {
    const id = localStorage.getItem(STORAGE_KEY_ATIVA);
    if (!id) return null;
    return getEmpresas().find(e => e.id === id) ?? null;
}

export function setEmpresaAtiva(id: string): void {
    localStorage.setItem(STORAGE_KEY_ATIVA, id);
}


// ---- IXC API Types ----

export interface IXCCliente {
    id: string;
    razao: string;          // Nome / Razão Social
    fantasia?: string;
    tipo_pessoa: 'F' | 'J'; // F = Físico, J = Jurídico
    cnpj_cpf?: string;      // CPF/CNPJ do IXC
    telefone_celular?: string; // IXC Celular
    telefone_comercial?: string; // IXC Fone
    email?: string;
    ativo: 'S' | 'N';
    cidade?: string;
    bairro?: string;
    endereco?: string;
    numero?: string;
}

export interface IXCFibraONU {
    id: string;
    id_cliente: string;
    numero_serie: string;   // Serial / MAC
    mac: string;
    descricao?: string;
    tipo?: string;
    status: 'A' | 'I';     // Ativo / Inativo
    id_olt?: string;
    porta_olt?: string;
    vlan?: string;
}

export interface IXCRadioCliente {
    id: string;
    id_cliente: string;
    mac: string;
    modelo?: string;
    descricao?: string;
    ip?: string;
    status: 'A' | 'I';
    id_concentrador?: string;
    id_roteador?: string;
}

export interface IXCClienteServico {
    id: string;
    id_cliente: string;
    descricao?: string;
    contrato?: string;
    status: 'A' | 'I' | 'B'; // Ativo / Inativo / Bloqueado
    valor_contrato?: string;
    data_ativacao?: string;
    produto?: string;
    velocidade_download?: string;
    velocidade_upload?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
}

export interface IXCApiResponse<T> {
    type: string;
    total: string;
    registros: T[];
}

// ---- Core Fetch Function ----

/**
 * Build the Authorization header for IXC Soft.
 * IXC expects: Basic base64("userId:apiKey")
 * If the token already contains ":", use as-is. Otherwise prefix "1:".
 */
function buildIXCAuth(token: string): string {
    if (token.startsWith('Basic ')) return token; // Already encoded
    const tokenStr = token.includes(':') ? token : `1:${token}`;
    // In browser we use btoa; in Node (Vite proxy) Buffer is available
    const encoded = typeof btoa !== 'undefined'
        ? btoa(tokenStr)
        : Buffer.from(tokenStr).toString('base64');
    return `Basic ${encoded}`;
}

/**
 * Build request headers for IXC Soft API.
 */
function buildIXCHeaders(empresa: IXCEmpresa): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'ixcsoft': 'listar',
        'Authorization': buildIXCAuth(empresa.token),
        // Tells our Vite proxy where to forward the request
        'x-ixc-target': empresa.url.replace(/\/$/, ''),
    };
}

/**
 * Core fetch — sends POST with JSON body (IXC Soft uses POST for queries).
 * Returns raw Response without throwing.
 */
async function ixcFetchRaw(
    empresa: IXCEmpresa,
    table: string,
    params: Record<string, string | number> = {}
): Promise<Response> {
    const url = `/api/ixc/${encodeURIComponent(empresa.id)}/webservice/v1/${table}`;
    return fetch(url, {
        method: 'POST',
        headers: buildIXCHeaders(empresa),
        body: JSON.stringify(params),
    });
}

async function ixcFetch<T>(
    empresa: IXCEmpresa,
    table: string,
    params: Record<string, string | number> = {}
): Promise<IXCApiResponse<T>> {
    const res = await ixcFetchRaw(empresa, table, params);

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`IXC API error ${res.status}: ${text.slice(0, 300)}`);
    }

    return res.json();
}


// ---- API Methods ----

/** Testa a conexão com o servidor IXC. Retorna { ok, erro } */
export async function testarConexao(empresa: IXCEmpresa): Promise<{ ok: boolean; erro?: string }> {
    try {
        const res = await ixcFetchRaw(empresa, 'cliente', { qtype: 'cliente.id', query: '1', oper: '=', page: 1, rp: 1 });
        const text = await res.text().catch(() => '');
        if (!res.ok) {
            return { ok: false, erro: `HTTP ${res.status}: ${text.slice(0, 200)}` };
        }
        // Validate it's actually IXC JSON, not an HTML redirect/error page
        try {
            const json = JSON.parse(text);
            if (typeof json === 'object' && json !== null) return { ok: true };
            return { ok: false, erro: 'Resposta inválida do servidor (não é JSON IXC)' };
        } catch {
            return { ok: false, erro: `Servidor retornou HTML em vez de JSON. Verifique a URL.` };
        }
    } catch (e) {
        return { ok: false, erro: e instanceof Error ? e.message : String(e) };
    }
}

/** Formata CPF/CNPJ para os formatos que o IXC pode armazenar */
function cpfFormatos(raw: string): string[] {
    const d = raw.replace(/\D/g, '');
    const formatos: string[] = [d, raw]; // raw digits + original
    if (d.length === 11) {
        // CPF: 000.000.000-00
        formatos.push(`${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`);
    } else if (d.length === 14) {
        // CNPJ: 00.000.000/0000-00
        formatos.push(`${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`);
    }
    return [...new Set(formatos)]; // deduplicate
}

/** Busca clientes por nome, CPF ou CNPJ */
export async function searchClientes(
    empresa: IXCEmpresa,
    query: string,
    campo: 'razao' | 'fn_cgccpf' | 'fone_celular' = 'razao'
): Promise<IXCCliente[]> {
    // For CPF/CNPJ, IXC may store formatted (with dots/dashes) — try all formats
    if (campo === 'fn_cgccpf') {
        const formatos = cpfFormatos(query);
        for (const fmt of formatos) {
            const data = await ixcFetch<IXCCliente>(empresa, 'cliente', {
                qtype: 'cliente.cnpj_cpf',
                query: fmt,
                oper: '=',
                page: 1,
                rp: 50,
            });
            if (data.registros && data.registros.length > 0) return data.registros;
        }
        return [];
    }

    const qtypeMap = {
        razao: 'cliente.razao',
        fone_celular: 'cliente.telefone_celular',
    } as const;

    const data = await ixcFetch<IXCCliente>(empresa, 'cliente', {
        qtype: qtypeMap[campo as 'razao' | 'fone_celular'],
        query,
        oper: 'like',
        page: 1,
        rp: 50,
    });
    return data.registros ?? [];
}

/** Obtém um cliente pelo ID */
export async function getClienteById(empresa: IXCEmpresa, id: string): Promise<IXCCliente | null> {
    const data = await ixcFetch<IXCCliente>(empresa, 'cliente', {
        qtype: 'cliente.id',
        query: id,
        oper: '=',
        page: 1,
        rp: 1,
    });
    return data.registros?.[0] ?? null;
}

/** Retorna as ONUs de fibra vinculadas a um cliente */
export async function getONUsByCliente(empresa: IXCEmpresa, clienteId: string): Promise<IXCFibraONU[]> {
    const data = await ixcFetch<IXCFibraONU>(empresa, 'fibra_onu_cliente', {
        qtype: 'fibra_onu_cliente.id_cliente',
        query: clienteId,
        oper: '=',
        page: 1,
        rp: 50,
    });
    return data.registros ?? [];
}

/** Retorna os rádios vinculados a um cliente */
export async function getRadiosByCliente(empresa: IXCEmpresa, clienteId: string): Promise<IXCRadioCliente[]> {
    const data = await ixcFetch<IXCRadioCliente>(empresa, 'raio_cliente', {
        qtype: 'raio_cliente.id_cliente',
        query: clienteId,
        oper: '=',
        page: 1,
        rp: 50,
    });
    return data.registros ?? [];
}

/** Retorna os contratos/serviços de um cliente */
export async function getServicosByCliente(empresa: IXCEmpresa, clienteId: string): Promise<IXCClienteServico[]> {
    try {
        const data = await ixcFetch<IXCClienteServico>(empresa, 'cliente_contrato', {
            qtype: 'cliente_contrato.id_cliente',
            query: clienteId,
            oper: '=',
            page: 1,
            rp: 50,
        });
        console.log('--- FULL DATA FROM CONTRATO ---', data);

        // Return raw data even if it has different fields so the UI JSON dump can render it
        return data.registros ?? (Array.isArray(data) ? data : [data] as any);
    } catch (e) {
        console.error('Error fetching contrato:', e);
        return [];
    }
}

/** Retorna os títulos a receber em aberto para pegar o valor financeiro da mensalidade */
export async function getAreceberByCliente(empresa: IXCEmpresa, clienteId: string): Promise<any[]> {
    try {
        const data = await ixcFetch<any>(empresa, 'fn_areceber', {
            qtype: 'fn_areceber.id_cliente',
            query: clienteId,
            oper: '=',
            page: 1,
            rp: 50,
        });
        const abertos = (data.registros || []).filter((b: any) => b.status === 'A');
        console.log('--- BOLETOS (fn_areceber) ---', abertos);
        return abertos;
    } catch (e) {
        console.error('Error fetching boletos:', e);
        return [];
    }
}

/** Busca todos os equipamentos (ONUs + Rádios) de um cliente, mais os boletos a receber para pegar o valor exato */
export async function getEquipamentosByCliente(empresa: IXCEmpresa, clienteId: string) {
    const [onus, radios, servicos, boletos] = await Promise.all([
        getONUsByCliente(empresa, clienteId),
        getRadiosByCliente(empresa, clienteId),
        getServicosByCliente(empresa, clienteId),
        getAreceberByCliente(empresa, clienteId),
    ]);
    return { onus, radios, servicos, boletos };
}

// ─── Sync to SQLite DB ───────────────────────────────────────────────────────

/**
 * Sincroniza TODOS os clientes de uma empresa IXC, página por página,
 * salvando no banco SQLite local via API /db.
 * @param onProgress  Chamado após cada página com (total fetched, grand total)
 */
export async function syncAllClientes(
    empresa: IXCEmpresa,
    onProgress?: (fetched: number, total: number) => void
): Promise<number> {
    const PAGE_SIZE = 100;
    let page = 1;
    let grandTotal = 0;
    let totalFetched = 0;
    const batchSize = 500; // flush to DB every 500 clients
    let batch: IXCCliente[] = [];
    // First call clears old data (page 1). Subsequent calls append.
    let firstBatch = true;


    while (true) {
        const data = await ixcFetch<IXCCliente>(empresa, 'cliente', {
            qtype: 'cliente.ativo',
            query: 'S',
            oper: '=',
            page,
            rp: PAGE_SIZE,
            sortname: 'cliente.razao',
            sortorder: 'asc',
        });

        grandTotal = parseInt(data.total ?? '0', 10) || grandTotal;
        const registros = data.registros ?? [];

        // Map IXC fields to our internal expected fields for syncing
        const mappedBatch = registros.map((r: any) => ({
            ...r,
            fn_cgccpf: r.cnpj_cpf || '',
            fone_celular: r.telefone_celular || '',
            fone: r.telefone_comercial || ''
        }));

        batch.push(...mappedBatch);
        totalFetched += registros.length;

        if (onProgress) onProgress(totalFetched, grandTotal);

        // Flush when batch is full or on the first page (to clear old data)
        if (firstBatch || batch.length >= batchSize) {
            await dbSyncClientes(empresa.id, batch, firstBatch);
            firstBatch = false;
            batch = [];
        }

        if (registros.length < PAGE_SIZE || totalFetched >= grandTotal) break;
        page++;
    }

    // Flush remaining
    if (batch.length > 0) {
        await dbSyncClientes(empresa.id, batch);
    }

    return totalFetched;
}

// Legacy: kept for backward compatibility only
export interface IXCSyncResult {
    empresaId: string;
    empresaNome: string;
    clientes: IXCCliente[];
    sincronizadoEm: string;
}

export function getSyncedClientes(_empresaId: string): null {
    return null; // Data is now in SQLite
}
