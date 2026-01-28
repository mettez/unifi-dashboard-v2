import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { systemInfo } = useDashboard();

    return (
        <div className="layout">
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: '600', fontSize: '18px' }}>
                        <div style={{ width: '24px', height: '24px', background: 'var(--color-unifi-blue)', transform: 'rotate(45deg)', borderRadius: '4px' }}></div>
                        UniFi Network
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Controller: {systemInfo?.controllerVersion || 'Unknown'}
                    </span>
                </div>
            </header>

            <main className="dashboard-grid">
                {children}
            </main>
        </div>
    );
};
