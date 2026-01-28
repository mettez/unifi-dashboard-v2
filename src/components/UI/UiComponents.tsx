import React from 'react';

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
    <div style={{ width: '100px', height: '6px', background: '#2C3340', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
            width: `${value}%`,
            height: '100%',
            background: value > 90 ? 'var(--color-alert)' : 'var(--color-unifi-blue)',
            borderRadius: '3px'
        }} />
    </div>
);

export const StatusDot: React.FC<{ status: string }> = ({ status }) => {
    let color = 'var(--text-secondary)';
    if (status === 'Online') color = 'var(--color-success)';
    if (status === 'Offline') color = 'var(--color-alert)';
    if (status === 'Updating') color = 'var(--color-unifi-blue)'; // Or animated
    if (status === 'Queued') color = 'var(--text-secondary)';

    return (
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}66` }} />
    );
};
