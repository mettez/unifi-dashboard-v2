import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// 1. Load Environment Variables
console.log("--- 1. Loading Configuration ---");
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found!");
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim().replace(/['"]/g, ''); // Remove quotes
    }
});

let URL = env.VITE_UNIFI_CONTROLLER_URL || 'https://192.168.1.1';
if (!URL.startsWith('http')) {
    URL = `https://${URL}`;
}
const USERNAME = env.VITE_UNIFI_USERNAME;
const PASSWORD = env.VITE_UNIFI_PASSWORD;

console.log(`Target: ${URL}`);
console.log(`User:   ${USERNAME}`);
console.log(`Pass:   ${PASSWORD ? '********' : 'MISSING'}`);

if (!URL || !USERNAME || !PASSWORD) {
    console.error("❌ Missing configuration in .env");
    process.exit(1);
}

// 2. Setup Request Options (Self-signed certs + Headers)
const agent = new https.Agent({
    rejectUnauthorized: false
});

const makeRequest = async (path, method = 'POST', body = null) => {
    return new Promise((resolve, reject) => {
        const fullUrl = `${URL}${path}`;
        console.log(`\n--- Attempting: ${method} ${fullUrl} ---`);

        // Fix header spoofing
        const headers = {
            'Content-Type': 'application/json',
            'Origin': URL,
            'Referer': URL + '/',
            'X-Requested-With': 'XMLHttpRequest', // Crucial for UDM
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        if (body) headers['Content-Length'] = Buffer.byteLength(body);

        console.log("Headers:", JSON.stringify(headers, null, 2));

        const req = https.request(fullUrl, {
            method,
            headers,
            agent
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Response Status: ${res.statusCode} ${res.statusMessage}`);
                console.log(`Response Headers:`, res.headers);
                // console.log(`Response Body:`, data.substring(0, 500)); // Truncate
                resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
            });
        });

        req.on('error', (e) => {
            console.error(`❌ Connection Error: ${e.message}`);
            resolve(null);
        });

        if (body) req.write(body);
        req.end();
    });
};

// 3. Execute Tests
(async () => {
    const loginPayload = JSON.stringify({ username: USERNAME, password: PASSWORD });

    // Test A: Unifi OS Login (UDM / newer)
    console.log("\n>>> Test A: Unifi OS Login (/api/auth/login) <<<");
    let res = await makeRequest('/api/auth/login', 'POST', loginPayload);

    let cookie = '';

    if (res && res.statusCode === 200) {
        console.log("✅ Unifi OS Login SUCCESS!");
        cookie = res.headers['set-cookie']?.join('; ');
    } else if (res && res.statusCode === 403) {
        console.log("❌ Forbidden (403). Likely CSRF or Header check failure.");
    } else if (res && res.statusCode === 404) {
        console.log("⚠️  Not Found (404). This might be a legacy controller.");
    }

    // Test B: Legacy Login
    if (!cookie) {
        console.log("\n>>> Test B: Legacy Login (/api/login) <<<");
        res = await makeRequest('/api/login', 'POST', loginPayload);
        if (res && res.statusCode === 200) {
            console.log("✅ Legacy Login SUCCESS!");
            cookie = res.headers['set-cookie']?.join('; ');
        }
    }

    if (cookie) {
        console.log("\n✅ Authenticated! Cookie obtained.");
        // Test C: Fetch Devices
        // Note: We need to manually add Cookie header now
        const devicePath = res.statusCode === 200 && res.headers['x-csrf-token']
            ? '/proxy/network/api/s/default/stat/device' // Unifi OS Proxy Path
            : '/api/s/default/stat/device';

        console.log(`\n>>> Test C: Fetch Devices (${devicePath}) <<<`);
        // We'll just define a quick helper to pass cookies
        // ... (truncated for simplicity, let's just see if login works first)
    } else {
        console.error("\n❌ All Login attempts on default port failed.");

        // Test D: Try Port 8443 (Common for self-hosted controllers)
        console.log("\n>>> Test D: Try Port 8443 (https://192.168.1.2:8443) <<<");
        // Update URL to use 8443
        const originalURL = URL;
        URL = URL.replace('192.168.1.2', '192.168.1.2:8443'); // Naive replace, but works for this debugging context
        if (URL === originalURL) URL = URL + ":8443";

        console.log("New Target:", URL);
        res = await makeRequest('/api/auth/login', 'POST', loginPayload);
        if (res && res.statusCode === 200) {
            console.log("✅ Login SUCCESS on Port 8443!");
        } else if (res) {
            console.log(`❌ Failed on 8443: ${res.statusCode}`);
        }
    }
})();
