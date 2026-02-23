import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import http from 'http'
import https from 'https'
import type { Plugin, Connect } from 'vite'
import type { ServerResponse } from 'http'

// Dynamic IXC proxy: /api/ixc/<empresaId>/webservice/v1/... → IXC Server URL
// Frontend must send header: x-ixc-target: https://erp.suaempresa.com.br
function ixcProxyPlugin(): Plugin {
    return {
        name: 'ixc-dynamic-proxy',
        configureServer(server) {
            server.middlewares.use('/api/ixc', (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
                const target = req.headers['x-ixc-target'] as string | undefined;
                if (!target) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing x-ixc-target header' }));
                    return;
                }

                // Strip empresaId segment from URL path
                const cleanUrl = (req.url ?? '').replace(/^\/[^/]+/, '');
                const fullTargetUrl = `${target.replace(/\/$/, '')}${cleanUrl}`;

                const isHttps = fullTargetUrl.startsWith('https');
                const lib = isHttps ? https : http;
                const targetUrl = new URL(fullTargetUrl);

                const options: http.RequestOptions = {
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
                    // Remove WWW-Authenticate so the browser doesn't show a native
                    // Basic Auth dialog on 401 — our JS code handles it instead.
                    const responseHeaders = { ...proxyRes.headers };
                    delete responseHeaders['www-authenticate'];
                    responseHeaders['access-control-allow-origin'] = '*';

                    res.writeHead(proxyRes.statusCode ?? 200, responseHeaders);
                    proxyRes.pipe(res);
                });

                proxyReq.on('error', (err) => {
                    console.error('[IXC Proxy Error]', err.message);
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                });

                // Explicitly collect the request body before writing to proxyReq.
                // Using req.pipe() silently fails when Vite has already touched the stream.
                const chunks: Buffer[] = [];
                req.on('data', (chunk: Buffer) => chunks.push(chunk));
                req.on('end', () => {
                    const body = Buffer.concat(chunks);
                    if (body.length > 0) {
                        proxyReq.setHeader('content-length', body.length);
                        proxyReq.write(body);
                    }
                    proxyReq.end();
                });
                req.on('error', (err) => {
                    console.error('[IXC Proxy Request Error]', err.message);
                    proxyReq.destroy();
                });
            });
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), ixcProxyPlugin()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            '/db': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/auth': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/admin': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
})


