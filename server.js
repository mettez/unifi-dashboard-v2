import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Env manually since we don't have dotenv
const envPath = path.resolve(process.cwd(), '.env');
let env = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
        }
    });
}

let TARGET = env.VITE_UNIFI_CONTROLLER_URL || 'https://192.168.1.1';
if (!TARGET.startsWith('http')) TARGET = `https://${TARGET}`;
if (TARGET.endsWith('/')) TARGET = TARGET.slice(0, -1);

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Custom Agent to ignore SSL
const agent = new https.Agent({
    rejectUnauthorized: false
});

const getContentType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };
    return map[ext] || 'text/plain';
};

const server = http.createServer((req, clientRes) => {
    // 1. Handle API Proxy requests
    if (req.url.startsWith('/api') || req.url.startsWith('/proxy')) {
        const targetUrl = new URL(req.url, TARGET);
        console.log(`[Proxy] ${req.method} ${req.url} -> ${targetUrl.toString()}`);

        const headers = {
            'Content-Type': 'application/json',
            'Origin': TARGET,
            'Referer': TARGET + '/',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };

        if (req.headers['content-length']) {
            headers['Content-Length'] = req.headers['content-length'];
        }

        // Pass cookies cleanly (except for login which needs fresh headers usually, but we pass anyway for session)
        // UPDATE: logic from proxy.js to prevent 403 loops on login
        const isLogin = req.url.includes('/login');
        if (!isLogin && req.headers['cookie']) {
            headers['Cookie'] = req.headers['cookie'];
        }

        const options = {
            method: req.method,
            headers: headers,
            agent: agent
        };

        const proxyReq = https.request(targetUrl, options, (targetRes) => {
            Object.keys(targetRes.headers).forEach(key => {
                clientRes.setHeader(key, targetRes.headers[key]);
            });
            clientRes.writeHead(targetRes.statusCode);
            targetRes.pipe(clientRes);
        });

        proxyReq.on('error', (e) => {
            console.error(`ERROR: ${e.message}`);
            clientRes.writeHead(502);
            clientRes.end('Proxy Error');
        });

        req.pipe(proxyReq);
        return;
    }

    // 2. Handle Static Files (SPA)
    let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/') safePath = '/index.html';

    let filePath = path.join(DIST_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // SPA Fallback: If 404 and accepting HTML, serve index.html
            // But if it's an asset request (like .js or .css), return 404
            if (req.headers.accept && req.headers.accept.includes('text/html')) {
                filePath = path.join(DIST_DIR, 'index.html');
                fs.readFile(filePath, (err, content) => {
                    if (err) {
                        clientRes.writeHead(500);
                        clientRes.end('Error loading index.html');
                        return;
                    }
                    clientRes.writeHead(200, { 'Content-Type': 'text/html' });
                    clientRes.end(content);
                });
                return;
            }

            clientRes.writeHead(404);
            clientRes.end('Not Found');
            return;
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                clientRes.writeHead(500);
                clientRes.end('Server Error');
            } else {
                clientRes.writeHead(200, { 'Content-Type': getContentType(filePath) });
                clientRes.end(content);
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 UniFi Dashboard Server running on http://localhost:${PORT}`);
    console.log(`👉 Connected to Controller: ${TARGET}`);
    console.log(`👉 Mode: Production (Serving ./dist)`);
});
