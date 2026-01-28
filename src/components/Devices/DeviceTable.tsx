import React from 'react';
import type { DeviceType } from '../../types';
import { useDashboard } from '../../context/DashboardContext';
import { ProgressBar, StatusDot } from '../UI/UiComponents';
import { Router, Wifi } from 'lucide-react';

interface DeviceTableProps {
    type: DeviceType;
    title: string;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({ type, title }) => {
    const { devices, searchQuery } = useDashboard();

    const filteredDevices = devices.filter(d =>
        d.type === type &&
        (d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.ip.includes(searchQuery))
    ).sort((a, b) => {
        // Robust IP sorting
        const ipA = a.ip.split('.').map(Number);
        const ipB = b.ip.split('.').map(Number);

        for (let i = 0; i < 4; i++) {
            if ((ipA[i] || 0) < (ipB[i] || 0)) return -1;
            if ((ipA[i] || 0) > (ipB[i] || 0)) return 1;
        }
        return 0;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {type === 'Switch' ? <Router size={16} /> : <Wifi size={16} />}
                {title}
                <span style={{ background: '#21262d', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                    {filteredDevices.length} DEVICES
                </span>
            </div>

            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--border-radius-md)',
                overflow: 'hidden',
            }}>
                {/* Table Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 2fr 1.5fr 1.5fr 1fr', // Adjusted for Version column
                    padding: '12px 16px',
                    borderBottom: '1px solid #21262d',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '600'
                }}>
                    <div>Name</div>
                    <div>IP</div>
                    <div>Version</div>
                    <div>Usage</div>
                    <div style={{ textAlign: 'right' }}>Status</div>
                </div>

                {/* Rows */}
                <div style={{ /* No Scroll - Auto height */ }}>
                    {filteredDevices.map(device => {
                        const isOffline = device.status === 'Offline';
                        return (
                            <div key={device.id} style={{
                                display: 'grid',
                                gridTemplateColumns: '3fr 2fr 1.5fr 1.5fr 1fr', // Match header
                                padding: '12px 16px',
                                borderBottom: '1px solid #21262d',
                                alignItems: 'center',
                                fontSize: '14px',
                                background: isOffline ? 'rgba(234, 67, 53, 0.1)' : 'transparent', // Red overlay
                                transition: 'background 0.2s'
                            }}>
                                <div style={{ fontWeight: '500', color: isOffline ? 'var(--color-alert)' : 'var(--text-primary)' }}>
                                    {device.name}
                                </div>
                                <div style={{ color: 'var(--text-secondary)' }}>{device.ip}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'monospace' }}>
                                    {device.firmware}
                                </div>
                                <div>
                                    {isOffline ? (
                                        <span style={{ color: 'var(--text-secondary)' }}>—</span>
                                    ) : (
                                        <ProgressBar value={device.usage} />
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <StatusDot status={device.status} />
                                </div>
                            </div>
                        );
                    })}
                </div>
                {filteredDevices.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        No devices found.
                    </div>
                )}
            </div>
        </div>
    );
};
