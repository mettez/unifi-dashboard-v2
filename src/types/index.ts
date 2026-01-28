export type DeviceType = 'Switch' | 'AP';
export type DeviceStatus = 'Online' | 'Offline' | 'Updating' | 'Queued';

export interface Device {
    id: string;
    type: DeviceType;
    name: string;
    ip: string;
    firmware: string;
    usage: number; // 0-100
    status: DeviceStatus;
    updateAvailable: boolean;
    targetFirmware?: string;
}

export interface KPI {
    uptime: string; // Duration string (e.g. "14d 2h")
    onlineCount: number;
    totalCount: number;
    traffic: number; // in TB
    pendingUpdates: number;
}

export interface SystemInfo {
    controllerVersion: string;
    firmwareVersion: string;
}

export interface DashboardState {
    devices: Device[];
    kpi: KPI;
    systemInfo: SystemInfo;
    lastUpdated: Date;
}
