/**
 * db.js — Multi-tenant SQLite database manager using sql.js
 * Each company gets its own .db file in the data/ directory.
 * The old single camera.db is migrated into the admin's company db.
 */
import initSqlJS from 'sql.js';
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const LEGACY_DB_PATH = join(__dirname, '..', 'camera.db');

let SQL = null;
const dbCache = new Map(); // companyId → { db, path }

/** Must be called once at startup */
export async function initSql() {
    SQL = await initSqlJS();
    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
    }
}

/** Get (or create) the SQLite database for a specific company */
export function getCompanyDb(companyId) {
    if (!SQL) throw new Error('SQL not initialized — call initSql() first');

    const id = String(companyId);
    if (dbCache.has(id)) return dbCache.get(id).db;

    const dbPath = join(DATA_DIR, `company_${id}.db`);
    let db;

    if (existsSync(dbPath)) {
        const buf = readFileSync(dbPath);
        db = new SQL.Database(buf);
        console.log(`[DB] Loaded company_${id}.db from disk`);
    } else {
        // Migrate legacy camera.db for admin (id=1) if it exists
        if (id === '1' && existsSync(LEGACY_DB_PATH)) {
            copyFileSync(LEGACY_DB_PATH, dbPath);
            const buf = readFileSync(dbPath);
            db = new SQL.Database(buf);
            console.log(`[DB] Migrated legacy camera.db → company_1.db`);
        } else {
            db = new SQL.Database();
            console.log(`[DB] Created new company_${id}.db`);
        }
    }

    dbCache.set(id, { db, path: dbPath });
    createSchema(db);
    return db;
}

/** Persist a specific company's database to disk */
export function persistCompany(companyId) {
    const id = String(companyId);
    const entry = dbCache.get(id);
    if (!entry) return;
    const data = entry.db.export();
    writeFileSync(entry.path, Buffer.from(data));
}

// ─── Schema ────────────────────────────────────────────────────────────────────

function createSchema(db) {
    db.run(`
        CREATE TABLE IF NOT EXISTS empresas (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            url TEXT NOT NULL,
            token TEXT NOT NULL,
            ativa INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS clientes_sync (
            id TEXT,
            empresa_id TEXT NOT NULL,
            razao TEXT,
            fn_cgccpf TEXT,
            fone_celular TEXT,
            fone TEXT,
            email TEXT,
            ativo TEXT DEFAULT 'S',
            cidade TEXT,
            bairro TEXT,
            endereco TEXT,
            numero TEXT,
            tipo_pessoa TEXT DEFAULT 'F',
            valor_mensalidade TEXT,
            sincronizado_em TEXT,
            PRIMARY KEY (id, empresa_id)
        );

        CREATE TABLE IF NOT EXISTS equipamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria TEXT NOT NULL,
            modelo TEXT NOT NULL,
            serial_number TEXT,
            mac TEXT,
            status TEXT DEFAULT 'Em Estoque',
            ixc_cliente_id TEXT,
            ixc_cliente_nome TEXT,
            observacao TEXT,
            preco_custo TEXT
        );

        CREATE TABLE IF NOT EXISTS estoque_produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id TEXT,
            modelo TEXT,
            categoria TEXT,
            estoque_minimo INTEGER DEFAULT 0,
            quantidade INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS equipamentos_historico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipamento_id INTEGER,
            data TEXT,
            acao TEXT,
            cliente_id TEXT,
            cliente_nome TEXT,
            observacao TEXT
        );

        CREATE TABLE IF NOT EXISTS fornecedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            contato TEXT,
            telefone TEXT,
            email TEXT,
            endereco TEXT,
            observacao TEXT
        );

        CREATE TABLE IF NOT EXISTS compras_estoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER NOT NULL,
            fornecedor_id INTEGER,
            fornecedor_nome TEXT,
            data TEXT NOT NULL,
            quantidade INTEGER NOT NULL DEFAULT 0,
            valor_unitario REAL DEFAULT 0,
            valor_total REAL DEFAULT 0,
            nota_fiscal TEXT,
            observacao TEXT
        );

        CREATE TABLE IF NOT EXISTS app_clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            document TEXT,
            type TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            contracts TEXT,
            monthlyFee TEXT
        );

        CREATE TABLE IF NOT EXISTS app_contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clientId INTEGER,
            clientName TEXT,
            type TEXT,
            start TEXT,
            value TEXT,
            status TEXT
        );

        CREATE TABLE IF NOT EXISTS app_leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            company TEXT,
            phone TEXT,
            status TEXT,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS app_invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client TEXT,
            due TEXT,
            value TEXT,
            status TEXT
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);

    // Migrations for existing databases
    const safeAddColumn = (table, column, def) => {
        const info = db.exec(`PRAGMA table_info(${table})`)[0];
        if (info && !info.values.find(v => v[1] === column)) {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
            console.log(`[DB] Migration: added ${column} to ${table}`);
        }
    };

    safeAddColumn('clientes_sync', 'valor_mensalidade', 'TEXT');
    safeAddColumn('clientes_sync', 'sincronizado_em', 'TEXT');
    safeAddColumn('equipamentos', 'preco_custo', 'TEXT');
    safeAddColumn('equipamentos', 'valor_mensal', 'TEXT');
    safeAddColumn('equipamentos', 'ixc_id_externo', 'TEXT');
    safeAddColumn('estoque_produtos', 'valor_total', 'TEXT');
}

// ─── Legacy compat (used during transition) ────────────────────────────────────

let legacyDb = null;

export async function initDb() {
    await initSql();
    legacyDb = getCompanyDb(1);
    return legacyDb;
}

export function getDb() {
    if (!legacyDb) throw new Error('Database not initialized');
    return legacyDb;
}

export function persist() {
    persistCompany(1);
}
