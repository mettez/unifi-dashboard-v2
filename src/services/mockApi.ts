import type { Device, KPI, SystemInfo } from '../types';

const INITIAL_DEVICES: Device[] = [
    { id: '1', type: 'Switch', name: 'USW-Pro-48-Core', ip: '192.168.1.2', firmware: '3.1.14', usage: 45, status: 'Online', updateAvailable: false },
    { id: '2', type: 'Switch', name: 'USW-Lite-16-G', ip: '192.168.1.12', firmware: '6.2.1', usage: 0, status: 'Offline', updateAvailable: true, targetFirmware: '6.5.0' },
    { id: '3', type: 'Switch', name: 'USW-Aggr-Server', ip: '192.168.1.5', firmware: '3.1.14', usage: 80, status: 'Online', updateAvailable: false },
    { id: '4', type: 'Switch', name: 'USW-Pro-24-Off', ip: '192.168.1.15', firmware: '3.1.14', usage: 12, status: 'Online', updateAvailable: false },
    { id: '5', type: 'AP', name: 'U6-Enterprise-Attic', ip: '192.168.1.20', firmware: '3.1.14', usage: 30, status: 'Online', updateAvailable: false },
    { id: '6', type: 'AP', name: 'U6-Mesh-Outdoor', ip: '192.168.1.25', firmware: '6.2.1', usage: 0, status: 'Offline', updateAvailable: true, targetFirmware: '6.5.0' },
    { id: '7', type: 'AP', name: 'U6-Lite-Guest', ip: '192.168.1.28', firmware: '3.1.14', usage: 60, status: 'Online', updateAvailable: false },
    { id: '8', type: 'AP', name: 'AP-In-Wall-HD-04', ip: '192.168.1.41', firmware: '3.1.14', usage: 10, status: 'Online', updateAvailable: false },
    // Adding more to reach closer to "15 switches and 15 APs" requirement simulation, though visual is key
    ...Array.from({ length: 11 }).map((_, i) => ({
        id: `sw-${i + 10}`, type: 'Switch' as const, name: `USW-Floor-${i + 1}`, ip: `192.168.1.${50 + i}`, firmware: '3.1.14', usage: Math.floor(Math.random() * 60), status: 'Online' as const, updateAvailable: false
    })),
    ...Array.from({ length: 11 }).map((_, i) => ({
        id: `ap-${i + 10}`, type: 'AP' as const, name: `U6-Corridor-${i + 1}`, ip: `192.168.1.${80 + i}`, firmware: '3.1.14', usage: Math.floor(Math.random() * 40), status: 'Online' as const, updateAvailable: false
    })),
];

// Helper to simulate network jitter
const getRandomUsage = (current: number) => {
    const change = Math.floor(Math.random() * 10) - 5;
    return Math.max(0, Math.min(100, current + change));
}

export const mockApi = {
    getDevices: async (): Promise<Device[]> => {
        return new Promise((resolve) => {
            // Simulate network delay
            setTimeout(() => resolve([...INITIAL_DEVICES]), 500);
        });
    },

    getKPI: async (): Promise<KPI> => {
        // simulate dynamic calculation
        return {
            uptime: '99.9%',
            onlineCount: 28, // dynamic later
            totalCount: 30,
            traffic: 1.2,
            pendingUpdates: 5
        }
    },

    getSystemInfo: async (): Promise<SystemInfo> => {
        return {
            controllerVersion: '7.4.156',
            firmwareVersion: '3.1.14'
        };
    },

    simulateUpdates: (devices: Device[]): Device[] => {
        return devices.map(d => {
            if (d.status === 'Offline') return d; // Offline stays offline
            return {
                ...d,
                usage: getRandomUsage(d.usage)
            }
        })
    }
}
