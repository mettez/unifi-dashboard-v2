import type { Device, KPI, SystemInfo } from '../types';

const API_PREFIX = '/api';

// State to track if we need the /proxy/network prefix (UDM/Unifi OS)
let isUnifiOs = false;
let cachedFirmwareVersion: string | null = null;

// Helper to construct URLs dynamically
const getUrl = (path: string) => {
    // If it's a stats path and we are on Unifi OS, prepend /proxy/network
    if (isUnifiOs && path.startsWith('/s/')) {
        return `${API_PREFIX}/proxy/network${path}`; // Note: API_PREFIX is /api, so /api/proxy/network... NO.
        // The proxy in vite forwards /api -> https://target/api
        // UDM needs https://target/proxy/network/api/s/...
        // So we need to request /api/proxy/network/api/s/... via our vite proxy?
        // OUR Vite proxy maps /api/* -> target/api/*.
        // If we request /api/proxy/network/api/s/..., it maps to target/api/proxy/network... INVALID.

        // We need to adjust the Vite proxy or usage.
        // Current Vite Proxy: '/api' -> target/api
        // If target is https://192.168.1.1
        // Fetch('/api/auth/login') -> https://192.168.1.1/api/auth/login

        // UDM Data path: https://192.168.1.1/proxy/network/api/s/default/...
        // If we use current proxy: Fetch('/api/proxy/network/api/s/...') -> https://192.168.1.1/api/proxy/network... WRONG.
    }
    // Let's fix this in the logic below, assuming we might need to adjust vite config or just logic.
    // For now, let's keep simple logic and maybe just changing the proxy config in next step is better? 
    // No, simple fix:
    // If we detect UnifiOS, we probably need to fetch `/proxy/network/api/s/...` 
    // But our Vite proxy only proxies `/api`.
    // So we should probably proxy `/` or specific paths.

    // EASIER FIX:
    // Change Vite Proxy to proxy `^/api/` -> `https://target/api/` matches.
    // AND proxy `^/proxy/` -> `https://target/proxy/`

    return `${API_PREFIX}${path}`;
};


export const unifiApi = {
    login: async () => {
        console.log("Attempting Unifi OS Login...");
        // Try UDM / Unifi OS Login first
        let response = await fetch(`${API_PREFIX}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: import.meta.env.VITE_UNIFI_USERNAME,
                password: import.meta.env.VITE_UNIFI_PASSWORD,
            }),
            credentials: 'include',
        });

        if (response.ok) {
            console.log("Logged in via Unifi OS (/api/auth/login). Setting isUnifiOs = true");
            isUnifiOs = true;

            // Try to get version from headers
            const headerVersion = response.headers.get('x-unifi-os-version');
            if (headerVersion) {
                console.log("Found UniFi OS version in headers:", headerVersion);
                cachedFirmwareVersion = headerVersion;
            }

            try {
                // consume body to ensure complete response
                await response.json();
            } catch (e) { /* ignore */ }
            return;
        }

        console.log(`Unifi OS Login failed (${response.status}). Trying Legacy...`);

        // Fallback for older controllers
        response = await fetch(`${API_PREFIX}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: import.meta.env.VITE_UNIFI_USERNAME,
                password: import.meta.env.VITE_UNIFI_PASSWORD,
            }),
            credentials: 'include',
        });

        if (response.ok) {
            console.log("Logged in via Legacy (/api/login). isUnifiOs = false");
            isUnifiOs = false;
            return;
        }

        console.error("All login attempts failed.", response.status, response.statusText);
    },

    getDevices: async (): Promise<Device[]> => {
        try {
            // Construct path based on OS logic. 
            // NOTE: We need to handle the proxy prefixing issue. 
            // We will assume for a moment we can request the right URL relative to our proxy.
            // If isUnifiOs, we need `/proxy/network/api...`.
            // Our Vite proxy is currently strict on `/api`.

            let path = `${API_PREFIX}/s/default/stat/device`;
            if (isUnifiOs) {
                // We need to fetch from /proxy/network/api...
                // Since our vite proxy is strict, we will need to update vite config to proxy /proxy as well.
                // I will write this assuming I update vite config next.
                path = `/proxy/network/api/s/default/stat/device`;
            }

            const response = await fetch(path, { credentials: 'include' });
            if (!response.ok) throw new Error(`Failed to fetch devices from ${path}: ${response.status} ${response.statusText}`);
            const data = await response.json();

            // Transform API data to our Device interface
            return (data.data || []).map((d: any) => {
                let type: Device['type'] = 'AP';

                // 1. Strict Type Check from API
                if (d.type === 'usw') type = 'Switch';
                else if (d.type === 'uap') type = 'AP';
                else if (d.type === 'ugw') type = 'AP'; // Gateways are often AP-like in management

                // 2. Model Name Fallback (if type is generic or missing)
                else if (d.model) {
                    const m = d.model.toUpperCase();
                    if (m.startsWith('USW') || m.startsWith('US-')) type = 'Switch';
                    else if (m.startsWith('UAP') || m.startsWith('U6') || m.startsWith('U7') || m.startsWith('AC')) type = 'AP';
                }

                return {
                    id: d._id,
                    type: type,
                    name: d.name || d.mac,
                    ip: d.ip,
                    firmware: d.version,
                    usage: parseFloat(d['system-stats']?.cpu || 0),
                    status: d.state === 1 ? 'Online' : 'Offline',
                    updateAvailable: d.upgradable || false,
                    targetFirmware: d.upgradable ? 'unknown' : undefined
                };
            });

        } catch (e) {
            console.error("Unifi API Error (getDevices):", e);
            return [];
        }
    },

    async getSystemInfo(): Promise<SystemInfo> {
        try {
            // 1. Get Network Controller Version
            let sysPath = `${API_PREFIX}/s/default/stat/sysinfo`;
            if (isUnifiOs) {
                sysPath = `/proxy/network/api/s/default/stat/sysinfo`;
            }

            const sysResponse = await fetch(sysPath, { credentials: 'include' });
            const sysData = await sysResponse.json();
            const controllerVer = sysData.data?.[0]?.version || 'Unknown';

            // 2. Get UniFi OS Version - Skipped as per user request
            // const firmwareVer = ...

            return {
                controllerVersion: controllerVer,
                firmwareVersion: '',
            };
        } catch (e) {
            console.error("Unifi API Error (getSystemInfo):", e);
            return { controllerVersion: 'Unknown', firmwareVersion: 'Unknown' };
        }
    },

    getKPI: async (): Promise<KPI> => {
        try {
            let healthPath = `${API_PREFIX}/s/default/stat/health`;
            let sysPath = `${API_PREFIX}/s/default/stat/sysinfo`;

            if (isUnifiOs) {
                healthPath = `/proxy/network/api/s/default/stat/health`;
                sysPath = `/proxy/network/api/s/default/stat/sysinfo`;
            }

            const [healthResponse, sysResponse] = await Promise.all([
                fetch(healthPath, { credentials: 'include' }),
                fetch(sysPath, { credentials: 'include' })
            ]);

            const healthData = await healthResponse.json();
            const sysData = await sysResponse.json();
            const sys = sysData.data?.[0] || {};

            // Unifi returns uptime in seconds in sysinfo
            let uptimeStr = 'Unknown';
            if (sys.uptime) {
                const seconds = parseInt(sys.uptime);
                const days = Math.floor(seconds / (3600 * 24));
                const hours = Math.floor((seconds % (3600 * 24)) / 3600);
                uptimeStr = `${days}d ${hours}h`;
            }

            // Aggregate health data
            const wan = healthData.data?.find((h: any) => h.subsystem === 'wan') || {};
            const wlan = healthData.data?.find((h: any) => h.subsystem === 'wlan') || {};
            const lan = healthData.data?.find((h: any) => h.subsystem === 'lan') || {};

            return {
                uptime: uptimeStr,
                onlineCount: (wlan.num_user || 0) + (lan.num_user || 0),
                totalCount: 0,
                traffic: ((wan.rx_bytes || 0) + (wan.tx_bytes || 0)) / (1024 * 1024 * 1024 * 1024),
                pendingUpdates: 0
            };
        } catch (e) {
            console.error("Unifi API Error (getKPI):", e);
            return { uptime: '0h', onlineCount: 0, totalCount: 0, traffic: 0, pendingUpdates: 0 };
        }
    }
};
