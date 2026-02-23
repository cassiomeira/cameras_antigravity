/**
 * auth.js — Master database + authentication endpoints
 * Uses a separate master.db for user accounts and sessions
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes } from 'crypto';
import initSqlJS from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const MASTER_DB_PATH = join(DATA_DIR, 'master.db');

let masterDb = null;

// ─── Password Hashing ─────────────────────────────────────────────────────────

function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(salt + password).digest('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const check = createHash('sha256').update(salt + password).digest('hex');
    return check === hash;
}

// ─── Master DB Init ───────────────────────────────────────────────────────────

export async function initMasterDb() {
    const SQL = await initSqlJS();

    if (existsSync(MASTER_DB_PATH)) {
        const buf = readFileSync(MASTER_DB_PATH);
        masterDb = new SQL.Database(buf);
        console.log('[AUTH] Loaded master.db from disk');
    } else {
        masterDb = new SQL.Database();
        console.log('[AUTH] Created new master.db');
    }

    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
    }

    // Create tables
    masterDb.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            company_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            approved INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    masterDb.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Seed admin user if none exists
    const admins = masterDb.exec("SELECT COUNT(*) as c FROM users WHERE role='admin'");
    const adminCount = admins[0]?.values[0]?.[0] || 0;
    if (adminCount === 0) {
        const hash = hashPassword('admin123');
        masterDb.run(
            "INSERT INTO users (email, password_hash, company_name, role, approved) VALUES (?,?,?,?,?)",
            ['admin@camera.erp', hash, 'Administrador', 'admin', 1]
        );
        console.log('[AUTH] Created default admin: admin@camera.erp / admin123');
    }

    persistMaster();
}

function persistMaster() {
    const data = masterDb.export();
    writeFileSync(MASTER_DB_PATH, Buffer.from(data));
}

function masterRows(sql, params = []) {
    const stmt = masterDb.prepare(sql);
    if (params.length) stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
}

function masterRun(sql, params = []) {
    masterDb.run(sql, params);
    persistMaster();
}

// ─── Auth Middleware ───────────────────────────────────────────────────────────

export function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    const sessions = masterRows(
        "SELECT s.user_id, u.id, u.email, u.company_name, u.role, u.approved FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')",
        [token]
    );

    if (sessions.length === 0) return res.status(401).json({ error: 'Sessão inválida ou expirada' });

    const user = sessions[0];
    if (!user.approved) return res.status(403).json({ error: 'Conta pendente de aprovação' });

    req.user = user;
    req.companyId = user.id;
    next();
}

export function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    next();
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

export function mountAuthRoutes(app) {
    // Register
    app.post('/auth/register', (req, res) => {
        const { email, password, company_name } = req.body;
        if (!email || !password || !company_name) {
            return res.status(400).json({ error: 'Preencha todos os campos' });
        }

        const existing = masterRows('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email já cadastrado' });
        }

        const hash = hashPassword(password);
        masterRun(
            'INSERT INTO users (email, password_hash, company_name) VALUES (?,?,?)',
            [email, hash, company_name]
        );

        console.log(`[AUTH] New registration: ${email} (${company_name})`);
        res.json({ ok: true, message: 'Conta criada! Aguarde aprovação do administrador.' });
    });

    // Login
    app.post('/auth/login', (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Preencha email e senha' });
        }

        const users = masterRows('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }

        const user = users[0];
        if (!verifyPassword(password, user.password_hash)) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }

        if (!user.approved) {
            return res.status(403).json({ error: 'Conta pendente de aprovação pelo administrador' });
        }

        // Create session token (30 days)
        const token = randomBytes(32).toString('hex');
        masterRun(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))",
            [token, user.id]
        );

        res.json({
            ok: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                company_name: user.company_name,
                role: user.role
            }
        });
    });

    // Me
    app.get('/auth/me', requireAuth, (req, res) => {
        res.json({
            id: req.user.id,
            email: req.user.email,
            company_name: req.user.company_name,
            role: req.user.role
        });
    });

    // Logout
    app.post('/auth/logout', (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            masterRun('DELETE FROM sessions WHERE token = ?', [token]);
        }
        res.json({ ok: true });
    });
}

// ─── Admin Routes ─────────────────────────────────────────────────────────────

export function mountAdminRoutes(app) {
    app.get('/admin/users', requireAuth, requireAdmin, (_req, res) => {
        const users = masterRows('SELECT id, email, company_name, role, approved, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    });

    app.put('/admin/users/:id/approve', requireAuth, requireAdmin, (req, res) => {
        masterRun('UPDATE users SET approved = 1 WHERE id = ?', [req.params.id]);
        console.log(`[ADMIN] Approved user #${req.params.id}`);
        res.json({ ok: true });
    });

    app.put('/admin/users/:id/reject', requireAuth, requireAdmin, (req, res) => {
        masterRun('UPDATE users SET approved = 0 WHERE id = ?', [req.params.id]);
        console.log(`[ADMIN] Rejected user #${req.params.id}`);
        res.json({ ok: true });
    });

    app.delete('/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
        const userId = parseInt(req.params.id);
        // Prevent deleting self
        if (req.user.id === userId) {
            return res.status(400).json({ error: 'Não é possível excluir a própria conta' });
        }
        masterRun('DELETE FROM sessions WHERE user_id = ?', [userId]);
        masterRun('DELETE FROM users WHERE id = ?', [userId]);
        console.log(`[ADMIN] Deleted user #${userId}`);
        res.json({ ok: true });
    });
}
