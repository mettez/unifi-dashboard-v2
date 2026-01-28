import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Device, KPI, SystemInfo } from '../types';
import { mockApi } from '../services/mockApi';
import { unifiApi } from '../services/unifiApi';

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';
const api = USE_REAL_API ? unifiApi : mockApi;

interface DashboardContextType {
    devices: Device[];
    kpi: KPI | null;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    updateFirmware: (id: string) => Promise<void>;
    updateAllFirmware: () => Promise<void>;
    systemInfo: SystemInfo;
    loading: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [kpi, setKpi] = useState<KPI | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [systemInfo, setSystemInfo] = useState<SystemInfo>({ controllerVersion: 'Unknown', firmwareVersion: 'Unknown' });

    // Initial Fetch
    useEffect(() => {
        const init = async () => {
            if (USE_REAL_API && unifiApi.login) {
                await unifiApi.login();
            }
            // Add getSystemInfo to api calls
            const [d, k, s] = await Promise.all([
                api.getDevices(),
                api.getKPI(),
                api.getSystemInfo ? api.getSystemInfo() : Promise.resolve({ controllerVersion: 'Unknown', firmwareVersion: 'Unknown' })
            ]);
            setDevices(d);
            setKpi(k);
            setSystemInfo(s);
            setLoading(false);
        };
        init();
    }, []);

    // Real-time Simulation Loop
    useEffect(() => {
        const interval = setInterval(async () => {
            if (USE_REAL_API) {
                const [d, k] = await Promise.all([api.getDevices(), api.getKPI()]);
                setDevices(d);
                setKpi(prev => prev ? ({ ...prev, ...k }) : k);
            } else {
                setDevices(prev => mockApi.simulateUpdates(prev));
            }
        }, USE_REAL_API ? 60000 : 3000);

        return () => clearInterval(interval);
    }, []);

    // KPI 30s Loop
    useEffect(() => {
        const interval = setInterval(async () => {
            const newKpi = await mockApi.getKPI();
            setKpi(prev => ({ ...prev!, traffic: newKpi.traffic, uptime: newKpi.uptime }));
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Update Online Count and Total Count derived from devices immediately
    useEffect(() => {
        if (!kpi) return; // Wait for initial KPI fetch

        const total = devices.length;
        const online = devices.filter(d => d.status === 'Online' || d.status === 'Updating').length;
        const pending = devices.filter(d => d.updateAvailable).length;

        // Only update if changed to avoid loops
        if (online !== kpi.onlineCount || total !== kpi.totalCount || pending !== kpi.pendingUpdates) {
            setKpi(prev => prev ? ({
                ...prev,
                onlineCount: online,
                totalCount: total,
                pendingUpdates: pending
            }) : null);
        }
    }, [devices, kpi]); // Added kpi to deps to ensure we compare against latest, guard clause prevents loop

    const updateFirmware = async (id: string) => {
        // Optimistic update
        setDevices(prev => prev.map(d =>
            d.id === id ? { ...d, status: 'Updating' } : d
        ));

        // Simulate Network Request
        setTimeout(() => {
            setDevices(prev => prev.map(d => {
                if (d.id === id) {
                    return {
                        ...d,
                        status: 'Online',
                        firmware: d.targetFirmware || d.firmware,
                        updateAvailable: false,
                        targetFirmware: undefined
                    };
                }
                return d;
            }));
        }, 5000);
    };

    const updateAllFirmware = async () => {
        const toUpdate = devices.filter(d => d.updateAvailable);
        toUpdate.forEach(() => {
            // Set to queued visually or directly updating? 
            // Prompt says: "status van alle apparaten met een beschikbare firmware-update verandert naar 'Queued'"
            // Then we process them? Or just simplify to updating?
            // Let's set to Queued then process.
        });

        setDevices(prev => prev.map(d => d.updateAvailable ? { ...d, status: 'Queued' } : d));

        // Simulate sequential or batch processing
        // For simplicity, let's start them "Updating" after a short delay to mimic a queue processor picking them up
        setTimeout(() => {
            setDevices(prev => prev.map(d => d.status === 'Queued' ? { ...d, status: 'Updating' } : d));

            // Then finish them
            setTimeout(() => {
                setDevices(prev => prev.map(d => {
                    if (d.status === 'Updating') {
                        return {
                            ...d,
                            status: 'Online',
                            firmware: d.targetFirmware || d.firmware,
                            updateAvailable: false,
                            targetFirmware: undefined
                        };
                    }
                    return d;
                }));
            }, 5000);
        }, 1000);
    };

    return (
        <DashboardContext.Provider value={{
            devices,
            kpi,
            searchQuery,
            setSearchQuery,
            updateFirmware,
            updateAllFirmware,
            systemInfo,
            loading
        }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) throw new Error('useDashboard must be used within a DashboardProvider');
    return context;
};
