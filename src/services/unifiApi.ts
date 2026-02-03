import type { Device, KPI, SystemInfo } from '../types';

const API_PREFIX = '/api';

// State to track if we need the /proxy/network prefix (UDM/Unifi OS)
let isUnifiOs = false;



// Helper to handle session timeout (401/403) by re-logging in automatically
const fetchWithAuth = async (url: string, options: RequestInit = {}, retries = 1): Promise<Response> => {
    try {
        const response = await fetch(url, { ...options, credentials: 'include' });

        if (response.status === 401 || response.status === 403) {
            if (retries > 0) {
                console.warn(`Auth failed (${response.status}) at ${url}. Attempting re-login...`);
                // Attempt to re-login
                await unifiApi.login();
                // Retry the original request
                return fetchWithAuth(url, options, retries - 1);
            } else {
                console.error("Re-login failed. Session expired.");
                // Optionally: window.location.reload(); to hard reset if truly stuck
            }
        }
        return response;
    } catch (e) {
        throw e;
    }
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

            const response = await fetchWithAuth(path);
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

            const sysResponse = await fetchWithAuth(sysPath);
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
                fetchWithAuth(healthPath),
                fetchWithAuth(sysPath)
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
