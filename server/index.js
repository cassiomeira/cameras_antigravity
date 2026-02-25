/**
 * Express server — Multi-tenant SQLite API for Camera ERP
 * Roda na porta 3001, chamado via proxy /db/* do Vite
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import { initSql, getCompanyDb, persistCompany } from './db.js';
import { initMasterDb, requireAuth, mountAuthRoutes, mountAdminRoutes } from './auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// ─── IXC Dynamic Proxy (Productive version of Vite plugin) ────────────────────
app.use('/api/ixc', (req, res, next) => {
    const target = req.headers['x-ixc-target'];
    if (!target) {
        return res.status(400).json({ error: 'Missing x-ixc-target header' });
    }

    // Strip empresaId segment from URL path
    const cleanUrl = req.url.replace(/^\/[^/]+/, '');
    const fullTargetUrl = `${target.replace(/\/$/, '')}${cleanUrl}`;

    const isHttps = fullTargetUrl.startsWith('https');
    const lib = isHttps ? https : http;
    const targetUrl = new URL(fullTargetUrl);

    const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers: {
            ...req.headers,
            host: targetUrl.hostname,
        },
    };

    const proxyReq = lib.request(options, (proxyRes) => {
        const responseHeaders = { ...proxyRes.headers };
        delete responseHeaders['www-authenticate'];
        responseHeaders['access-control-allow-origin'] = '*';

        res.writeHead(proxyRes.statusCode || 200, responseHeaders);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('[IXC Proxy Error]', err.message);
        res.status(502).json({ error: err.message });
    });

    req.pipe(proxyReq);
});

app.use(express.json({ limit: '50mb' }));

// ─── Auth routes (public) ─────────────────────────────────────────────────────
mountAuthRoutes(app);
mountAdminRoutes(app);

// ─── All /db/* routes require authentication ──────────────────────────────────
app.use('/db', requireAuth);

// ─── Per-request helpers ──────────────────────────────────────────────────────

function db(req) {
    return getCompanyDb(req.companyId);
}

function rows(req, stmt, params = []) {
    const res = db(req).exec(stmt, params);
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map(row =>
        Object.fromEntries(columns.map((c, i) => [c, row[i]]))
    );
}

function run(req, sql, params = []) {
    db(req).run(sql, params);
    persistCompany(req.companyId);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

app.get('/db/stats', (req, res) => {
    const empresas = rows(req, 'SELECT COUNT(*) as c FROM empresas')[0]?.c || 0;
    const clientes_sync = rows(req, 'SELECT COUNT(*) as c FROM clientes_sync')[0]?.c || 0;
    const equipamentos = rows(req, 'SELECT COUNT(*) as c FROM equipamentos')[0]?.c || 0;

    // Revenue calculations (from equipments/contracts)
    // Assuming 'valor_mensal' in equipamentos is recurring revenue
    const equip = rows(req, 'SELECT valor_mensal FROM equipamentos WHERE status = "No Cliente"');
    const recorrente = equip.reduce((acc, e) => acc + (parseFloat(e.valor_mensal) || 0), 0);

    // Contracts
    const cts = rows(req, 'SELECT status FROM app_contracts');
    const ativos = cts.filter(c => c.status === 'Ativo').length;
    const cancelados = cts.filter(c => c.status === 'Cancelado').length;
    const suspensos = cts.filter(c => c.status === 'Suspenso').length;

    res.json({
        empresas,
        clientes_sync,
        equipamentos,
        receita_recorrente: recorrente,
        receita_avulsa: 0, // Mock for now, maybe add invoices logic later
        contratos_ativos: ativos,
        contratos_cancelados: cancelados,
        contratos_suspensos: suspensos
    });
});

app.post('/db/wipe', (req, res) => {
    const tables = [
        'empresas', 'clientes_sync', 'equipamentos', 'estoque_produtos',
        'equipamentos_historico', 'fornecedores', 'compras_estoque',
        'app_clients', 'app_contracts', 'app_leads', 'app_invoices'
    ];
    for (const t of tables) {
        run(req, `DELETE FROM ${t}`);
    }
    res.json({ ok: true });
});

// ─── Settings (Theme & Logo) ──────────────────────────────────────────────────

app.get('/db/settings', (req, res) => {
    const list = rows(req, 'SELECT key, value FROM app_settings');
    const settings = {};
    for (const r of list) settings[r.key] = r.value;
    res.json(settings);
});

app.put('/db/settings', (req, res) => {
    if (typeof req.body === 'object' && req.body !== null) {
        for (const [key, value] of Object.entries(req.body)) {
            run(req, 'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, String(value || '')]);
        }
    }
    res.json({ ok: true });
});

// ─── Empresas IXC ─────────────────────────────────────────────────────────────

app.get('/db/empresas', (req, res) => {
    res.json(rows(req, 'SELECT * FROM empresas'));
});

app.post('/db/empresas', (req, res) => {
    const { id, nome, url, token, ativa } = req.body;
    run(req, 'INSERT OR REPLACE INTO empresas (id, nome, url, token, ativa) VALUES (?,?,?,?,?)',
        [id, nome, url, token, ativa ? 1 : 0]);
    res.json({ ok: true });
});

app.put('/db/empresas/:id', (req, res) => {
    const { nome, url, token, ativa } = req.body;
    run(req, 'UPDATE empresas SET nome=?, url=?, token=?, ativa=? WHERE id=?',
        [nome, url, token, ativa ? 1 : 0, req.params.id]);
    res.json({ ok: true });
});

app.put('/db/empresas/:id/ativar', (req, res) => {
    run(req, 'UPDATE empresas SET ativa = 0');
    run(req, 'UPDATE empresas SET ativa = 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

app.delete('/db/empresas/:id', (req, res) => {
    run(req, 'DELETE FROM clientes_sync WHERE empresa_id = ?', [req.params.id]);
    run(req, 'DELETE FROM empresas WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

// ─── Clientes Sync (IXC) ─────────────────────────────────────────────────────

app.get('/db/clientes', (req, res) => {
    const empresa = req.query.empresa;
    const q = req.query.q || '';
    const rp = Math.min(Number(req.query.rp) || 50, 200);
    let sql = 'SELECT * FROM clientes_sync WHERE empresa_id = ?';
    const params = [empresa];
    if (q) {
        sql += ' AND (razao LIKE ? OR fn_cgccpf LIKE ? OR fone_celular LIKE ? OR fone LIKE ?)';
        const like = `%${q}%`;
        params.push(like, like, like, like);
    }
    sql += ' ORDER BY razao ASC LIMIT ?';
    params.push(rp);
    const registros = rows(req, sql, params);

    let countSql = 'SELECT COUNT(*) as c FROM clientes_sync WHERE empresa_id = ?';
    const countParams = [empresa];
    if (q) {
        countSql += ' AND (razao LIKE ? OR fn_cgccpf LIKE ? OR fone_celular LIKE ? OR fone LIKE ?)';
        const like2 = `%${q}%`;
        countParams.push(like2, like2, like2, like2);
    }
    const total = rows(req, countSql, countParams)[0]?.c || 0;
    res.json({ registros, total });
});

app.get('/db/clientes/buscar-ixc-id', (req, res) => {
    const nome = req.query.nome;
    const empresa_id = req.query.empresa_id;
    if (!nome) return res.json({ found: false });
    let sql = 'SELECT id FROM clientes_sync WHERE razao = ?';
    const params = [nome];
    if (empresa_id) { sql += ' AND empresa_id = ?'; params.push(empresa_id); }
    sql += ' LIMIT 1';
    const result = rows(req, sql, params);
    res.json(result.length > 0 ? { found: true, ixc_id: result[0].id } : { found: false });
});

app.post('/db/clientes/sync', (req, res) => {
    const { empresa_id, registros, clientes } = req.body;
    const items = registros || clientes;

    if (!empresa_id || !Array.isArray(items)) {
        console.error('[SYNC ERROR] Invalid payload:', {
            has_empresa_id: !!empresa_id,
            has_items: !!items,
            is_array: Array.isArray(items),
            body_keys: Object.keys(req.body || {})
        });
        return res.status(400).json({
            error: 'bad',
            details: 'Missing empresa_id or registros array (tried "registros" and "clientes" keys)'
        });
    }

    const now = new Date().toISOString();
    for (const r of items) {
        run(req,
            `INSERT OR REPLACE INTO clientes_sync (id, empresa_id, razao, fn_cgccpf, fone_celular, fone, email, ativo, cidade, bairro, endereco, numero, tipo_pessoa, valor_mensalidade, sincronizado_em)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [r.id, empresa_id, r.razao, r.cnpj_cpf || r.fn_cgccpf, r.fone_celular, r.fone, r.email, r.ativo, r.cidade, r.bairro, r.endereco, r.numero, r.tipo_pessoa, r.valor_mensalidade ?? null, now]
        );
    }
    res.json({ ok: true, count: items.length });
});

app.delete('/db/clientes/sync/:empresa_id', (req, res) => {
    run(req, 'DELETE FROM clientes_sync WHERE empresa_id = ?', [req.params.empresa_id]);
    res.json({ ok: true });
});

// ─── Equipamentos ─────────────────────────────────────────────────────────────

app.get('/db/equipamentos', (req, res) => {
    res.json(rows(req, 'SELECT * FROM equipamentos ORDER BY id DESC'));
});

app.post('/db/equipamentos', (req, res) => {
    const { categoria, modelo, serial_number, mac, status, ixc_cliente_id, ixc_cliente_nome, observacao, preco_custo, valor_mensal, ixc_id_externo } = req.body;
    run(req,
        `INSERT INTO equipamentos (categoria, modelo, serial_number, mac, status, ixc_cliente_id, ixc_cliente_nome, observacao, preco_custo, valor_mensal, ixc_id_externo)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [categoria, modelo, serial_number, mac, status || 'Em Estoque', ixc_cliente_id, ixc_cliente_nome, observacao, preco_custo, valor_mensal || '', ixc_id_externo || '']
    );
    const id = rows(req, 'SELECT last_insert_rowid() as id')[0]?.id;
    res.json({ ok: true, id });
});

app.put('/db/equipamentos/:id', (req, res) => {
    const { categoria, modelo, serial_number, mac, status, ixc_cliente_id, ixc_cliente_nome, observacao, preco_custo, valor_mensal, ixc_id_externo } = req.body;
    run(req,
        `UPDATE equipamentos SET categoria=?, modelo=?, serial_number=?, mac=?, status=?, ixc_cliente_id=?, ixc_cliente_nome=?, observacao=?, preco_custo=?, valor_mensal=?, ixc_id_externo=? WHERE id=?`,
        [categoria, modelo, serial_number, mac, status, ixc_cliente_id, ixc_cliente_nome, observacao, preco_custo, valor_mensal || '', ixc_id_externo || '', req.params.id]
    );
    res.json({ ok: true });
});

app.delete('/db/equipamentos/:id', (req, res) => {
    run(req, 'DELETE FROM equipamentos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

// ─── Equipamento Histórico ────────────────────────────────────────────────────

app.get('/db/equipamentos/:id/historico', (req, res) => {
    res.json(rows(req, 'SELECT * FROM equipamentos_historico WHERE equipamento_id = ? ORDER BY id DESC', [req.params.id]));
});

app.post('/db/equipamentos/:id/historico', (req, res) => {
    const { acao, cliente_id, cliente_nome, observacao } = req.body;
    run(req,
        'INSERT INTO equipamentos_historico (equipamento_id, data, acao, cliente_id, cliente_nome, observacao) VALUES (?,datetime(\'now\'),?,?,?,?)',
        [req.params.id, acao, cliente_id, cliente_nome, observacao]
    );
    res.json({ ok: true });
});

// ─── Estoque Produtos ─────────────────────────────────────────────────────────

app.get('/db/estoque_produtos', (req, res) => {
    res.json(rows(req, 'SELECT * FROM estoque_produtos ORDER BY id DESC'));
});

app.post('/db/estoque_produtos', (req, res) => {
    const { empresa_id, modelo, categoria, estoque_minimo, quantidade, valor_total } = req.body;
    run(req,
        'INSERT INTO estoque_produtos (empresa_id, modelo, categoria, estoque_minimo, quantidade, valor_total) VALUES (?,?,?,?,?,?)',
        [empresa_id, modelo, categoria, estoque_minimo, quantidade, valor_total ?? null]
    );
    const id = rows(req, 'SELECT last_insert_rowid() as id')[0]?.id;
    res.json({ ok: true, id });
});

app.put('/db/estoque_produtos/:id', (req, res) => {
    const { modelo, categoria, estoque_minimo, quantidade, valor_total } = req.body;
    run(req,
        'UPDATE estoque_produtos SET modelo=?, categoria=?, estoque_minimo=?, quantidade=?, valor_total=? WHERE id=?',
        [modelo, categoria, estoque_minimo, quantidade, valor_total ?? null, req.params.id]
    );
    res.json({ ok: true });
});

app.delete('/db/estoque_produtos/:id', (req, res) => {
    run(req, 'DELETE FROM estoque_produtos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

// ─── Fornecedores ─────────────────────────────────────────────────────────────

app.get('/db/fornecedores', (req, res) => {
    res.json(rows(req, 'SELECT * FROM fornecedores ORDER BY nome ASC'));
});

app.post('/db/fornecedores', (req, res) => {
    const { nome, contato, telefone, email, endereco, observacao } = req.body;
    run(req, 'INSERT INTO fornecedores (nome, contato, telefone, email, endereco, observacao) VALUES (?,?,?,?,?,?)',
        [nome, contato, telefone, email, endereco, observacao]);
    const id = rows(req, 'SELECT last_insert_rowid() as id')[0]?.id;
    res.json({ ok: true, id });
});

app.put('/db/fornecedores/:id', (req, res) => {
    const { nome, contato, telefone, email, endereco, observacao } = req.body;
    run(req, 'UPDATE fornecedores SET nome=?, contato=?, telefone=?, email=?, endereco=?, observacao=? WHERE id=?',
        [nome, contato, telefone, email, endereco, observacao, req.params.id]);
    res.json({ ok: true });
});

app.delete('/db/fornecedores/:id', (req, res) => {
    run(req, 'DELETE FROM fornecedores WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

// ─── Compras de Estoque ───────────────────────────────────────────────────────

app.get('/db/compras_estoque', (req, res) => {
    const pid = req.query.produto_id;
    if (pid) {
        res.json(rows(req, 'SELECT * FROM compras_estoque WHERE produto_id = ? ORDER BY data DESC', [pid]));
    } else {
        res.json(rows(req, 'SELECT * FROM compras_estoque ORDER BY data DESC'));
    }
});

app.post('/db/compras_estoque', (req, res) => {
    const { produto_id, fornecedor_id, fornecedor_nome, data, quantidade, valor_unitario, valor_total, nota_fiscal, observacao } = req.body;
    run(req,
        'INSERT INTO compras_estoque (produto_id, fornecedor_id, fornecedor_nome, data, quantidade, valor_unitario, valor_total, nota_fiscal, observacao) VALUES (?,?,?,?,?,?,?,?,?)',
        [produto_id, fornecedor_id, fornecedor_nome, data, quantidade, valor_unitario, valor_total, nota_fiscal, observacao]
    );
    const id = rows(req, 'SELECT last_insert_rowid() as id')[0]?.id;
    res.json({ ok: true, id });
});

app.delete('/db/compras_estoque/:id', (req, res) => {
    run(req, 'DELETE FROM compras_estoque WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

// ─── App Clients ──────────────────────────────────────────────────────────────

app.get('/db/app_clients', (req, res) => {
    res.json(rows(req, 'SELECT * FROM app_clients ORDER BY name ASC'));
});

app.post('/db/app_clients', (req, res) => {
    const { name, document, type, phone, email, address, contracts, monthlyFee } = req.body;
    run(req,
        'INSERT INTO app_clients (name, document, type, phone, email, address, contracts, monthlyFee) VALUES (?,?,?,?,?,?,?,?)',
        [name, document || '', type || 'PF', phone || '', email || '', address || '', contracts || '', monthlyFee || '']
    );
    const id = rows(req, 'SELECT last_insert_rowid() as id')[0]?.id;
    res.json({ ok: true, id });
});

app.put('/db/app_clients/:id', (req, res) => {
    const { name, document, type, phone, email, address, contracts, monthlyFee } = req.body;
    run(req,
        'UPDATE app_clients SET name=?, document=?, type=?, phone=?, email=?, address=?, contracts=?, monthlyFee=? WHERE id=?',
        [name, document, type, phone, email, address, contracts, monthlyFee, req.params.id]
    );
    res.json({ ok: true });
});

app.delete('/db/app_clients/:id', (req, res) => {
    run(req, 'DELETE FROM app_clients WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

// ─── App Contracts ────────────────────────────────────────────────────────────

app.get('/db/app_contracts', (req, res) => {
    res.json(rows(req, 'SELECT * FROM app_contracts ORDER BY id DESC'));
});

app.post('/db/app_contracts', (req, res) => {
    const { clientId, clientName, type, start, value, status } = req.body;
    run(req,
        'INSERT INTO app_contracts (clientId, clientName, type, start, value, status) VALUES (?,?,?,?,?,?)',
        [clientId, clientName, type, start, value, status]
    );
    const id = rows(req, 'SELECT last_insert_rowid() as id')[0]?.id;
    res.json({ ok: true, id });
});

app.put('/db/app_contracts/:id', (req, res) => {
    const { clientId, clientName, type, start, value, status } = req.body;
    run(req,
        'UPDATE app_contracts SET clientId=?, clientName=?, type=?, start=?, value=?, status=? WHERE id=?',
        [clientId, clientName, type, start, value, status, req.params.id]
    );
    res.json({ ok: true });
});

app.delete('/db/app_contracts/:id', (req, res) => {
    run(req, 'DELETE FROM app_contracts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

// ─── App Leads ────────────────────────────────────────────────────────────────

app.get('/db/app_leads', (req, res) => {
    res.json(rows(req, 'SELECT * FROM app_leads ORDER BY id DESC'));
});

app.post('/db/app_leads', (req, res) => {
    const { name, company, phone, status, value } = req.body;
    run(req,
        'INSERT INTO app_leads (name, company, phone, status, value) VALUES (?,?,?,?,?)',
        [name, company, phone, status, value]
    );
    const id = rows(req, 'SELECT last_insert_rowid() as id')[0]?.id;
    res.json({ ok: true, id });
});

app.put('/db/app_leads/:id', (req, res) => {
    const { name, company, phone, status, value } = req.body;
    run(req,
        'UPDATE app_leads SET name=?, company=?, phone=?, status=?, value=? WHERE id=?',
        [name, company, phone, status, value, req.params.id]
    );
    res.json({ ok: true });
});

app.delete('/db/app_leads/:id', (req, res) => {
    run(req, 'DELETE FROM app_leads WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

// ─── App Invoices ─────────────────────────────────────────────────────────────

app.get('/db/app_invoices', (req, res) => {
    res.json(rows(req, 'SELECT * FROM app_invoices ORDER BY id DESC'));
});

app.post('/db/app_invoices', (req, res) => {
    const { client, due, value, status } = req.body;
    run(req,
        'INSERT INTO app_invoices (client, due, value, status) VALUES (?,?,?,?)',
        [client, due, value, status]
    );
    const id = rows(req, 'SELECT last_insert_rowid() as id')[0]?.id;
    res.json({ ok: true, id });
});

app.put('/db/app_invoices/:id', (req, res) => {
    const { client, due, value, status } = req.body;
    run(req,
        'UPDATE app_invoices SET client=?, due=?, value=?, status=? WHERE id=?',
        [client, due, value, status, req.params.id]
    );
    res.json({ ok: true });
});

app.delete('/db/app_invoices/:id', (req, res) => {
    run(req, 'DELETE FROM app_invoices WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
});

// ─── Migrate orphaned equipment clients ───────────────────────────────────────

app.post('/db/migrate-orphan-clients', (req, res) => {
    const orphans = rows(req, `
        SELECT DISTINCT ixc_cliente_id, ixc_cliente_nome
        FROM equipamentos
        WHERE ixc_cliente_id IS NOT NULL AND ixc_cliente_nome IS NOT NULL
          AND ixc_cliente_nome != ''
    `);

    let created = 0;
    let updated = 0;

    for (const orphan of orphans) {
        const existing = rows(req,
            'SELECT id FROM app_clients WHERE UPPER(name) = UPPER(?) LIMIT 1',
            [orphan.ixc_cliente_nome]
        );

        let targetId;
        if (existing.length > 0) {
            targetId = existing[0].id;
        } else {
            run(req,
                'INSERT INTO app_clients (name, document, type, phone, email, address, contracts, monthlyFee) VALUES (?,?,?,?,?,?,?,?)',
                [orphan.ixc_cliente_nome, '', 'PF', '', '', '', '', '']
            );
            targetId = rows(req, 'SELECT last_insert_rowid() as id')[0]?.id;
            created++;
        }

        if (targetId && String(targetId) !== String(orphan.ixc_cliente_id)) {
            db(req).run(
                'UPDATE equipamentos SET ixc_cliente_id = ? WHERE ixc_cliente_id = ?',
                [String(targetId), orphan.ixc_cliente_id]
            );
            persistCompany(req.companyId);
            updated++;
        }
    }

    console.log(`[migrate-orphan-clients] Created ${created} clients, updated ${updated} equipment links`);
    res.json({ ok: true, created, updated, total: orphans.length });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../dist')));

// FALLBACK: Serve index.html for all non-API GET requests (SPA routing)
app.get(/(.*)/, (req, res) => {
    // Skip if it looks like an API call (already should have been handled or 404'd)
    if (req.path.startsWith('/db/') || req.path.startsWith('/auth/') || req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    // Serve index.html from dist
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

async function boot() {
    await initSql();
    await initMasterDb();
    app.listen(PORT, '0.0.0.0', () => console.log(`[SERVER] Running on http://0.0.0.0:${PORT}`));
}

boot();
