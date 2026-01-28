import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    subtext?: string;
    subtextColor?: string;
    Icon: LucideIcon;
    iconColor?: string;
    alert?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, subtext, subtextColor, Icon, iconColor, alert }) => {
    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--border-radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '90px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{title}</span>
                <Icon size={18} color={iconColor || 'var(--text-secondary)'} />
            </div>

            <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: '1.2' }}>{value}</div>
                {subtext && (
                    <div style={{
                        fontSize: '13px',
                        color: alert ? 'var(--color-alert)' : (subtextColor || 'var(--color-success)'),
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {subtext}
                    </div>
                )}
            </div>
        </div>
    );
};
