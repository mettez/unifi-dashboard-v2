import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

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
// Strip trailing slash
if (TARGET.endsWith('/')) TARGET = TARGET.slice(0, -1);

const PORT = 3001;

// Custom Agent to ignore SSL
const agent = new https.Agent({
    rejectUnauthorized: false
});

const server = http.createServer((req, clientRes) => {
    // Only handle /api and /proxy
    if (!req.url.startsWith('/api') && !req.url.startsWith('/proxy')) {
        clientRes.writeHead(404);
        clientRes.end('Not Found');
        return;
    }

    const targetUrl = new URL(req.url, TARGET);

    console.log(`[Proxy] ${req.method} ${req.url} -> ${targetUrl.toString()}`);

    // Headers to strictly match the working debug-unifi.js script
    const headers = {
        'Content-Type': 'application/json', // Force JSON for API
        'Origin': TARGET,
        'Referer': TARGET + '/',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // Forward strict set of safe headers from client if needed, but prefer clean slate for auth
    // We only pass content-length if present to allow body piping
    if (req.headers['content-length']) {
        headers['Content-Length'] = req.headers['content-length'];
    }

    // For non-login requests, we MIGHT need cookies (if we have them)
    // But for login, we definitely want to start fresh to avoid 403s on bad sessions
    const isLogin = req.url.includes('/login');
    if (!isLogin && req.headers['cookie']) {
        headers['Cookie'] = req.headers['cookie'];
    }

    const options = {
        method: req.method,
        headers: headers,
        agent: agent
    };

    // Make request to Unifi
    const proxyReq = https.request(targetUrl, options, (targetRes) => {
        console.log(`    < Response: ${targetRes.statusCode}`);

        // Forward headers back to client
        Object.keys(targetRes.headers).forEach(key => {
            // Fix set-cookie domain if needed (naive check)
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

    // Pipe client body to target
    req.pipe(proxyReq);
});

server.listen(PORT, () => {
    console.log(`\n🚀 Dedicated Unifi Proxy running on http://localhost:${PORT}`);
    console.log(`👉 Target: ${TARGET}`);
});
