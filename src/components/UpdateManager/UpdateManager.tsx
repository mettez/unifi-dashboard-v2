import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { ArrowRight, CheckCircle } from 'lucide-react';

export const UpdateManager: React.FC = () => {
    const { devices, updateFirmware, updateAllFirmware } = useDashboard();

    const pendingUpdates = devices.filter(d => d.updateAvailable);


    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Update Manager</h3>
                {pendingUpdates.length > 0 && (
                    <button
                        onClick={() => updateAllFirmware()}
                        style={{
                            background: 'var(--color-unifi-blue)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Update All
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pendingUpdates.map(device => (
                    <div key={device.id} style={{
                        background: 'var(--bg-card)',
                        padding: '16px',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid #30363d'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{device.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{device.type} • Critical</div>
                            </div>
                            <span style={{
                                fontSize: '10px',
                                background: '#fb8c0022',
                                color: 'var(--color-warning)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                height: 'fit-content',
                                fontWeight: 'bold'
                            }}>
                                {device.status === 'Queued' ? 'QUEUED' : 'READY'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                            <span>v{device.firmware}</span>
                            <ArrowRight size={12} />
                            <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>v{device.targetFirmware}</span>
                        </div>

                        {device.status !== 'Queued' && device.status !== 'Updating' && (
                            <button
                                onClick={() => updateFirmware(device.id)}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: '1px solid #30363d',
                                    color: 'var(--color-unifi-blue)',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                Update Now
                            </button>
                        )}
                        {(device.status === 'Queued' || device.status === 'Updating') && (
                            <div style={{
                                width: '100%',
                                textAlign: 'center',
                                fontSize: '12px',
                                color: 'var(--color-unifi-blue)',
                                padding: '8px',
                                background: 'rgba(0, 111, 255, 0.1)',
                                borderRadius: '4px'
                            }}>
                                {device.status === 'Updating' ? 'Installing...' : 'Queued'}
                            </div>
                        )}
                    </div>
                ))}

                {pendingUpdates.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                        <CheckCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <div style={{ fontSize: '14px' }}>All systems up to date</div>
                    </div>
                )}
            </div>
        </div>
    );
};
