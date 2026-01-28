import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { KPICard } from './KPICard';
import { Clock, Network, Activity, Smartphone } from 'lucide-react';

export const KPIHeader: React.FC = () => {
    const { kpi } = useDashboard();

    if (!kpi) return null;

    const onlineWarning = kpi.onlineCount < kpi.totalCount;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-lg)'
        }}>
            <KPICard
                title="System Uptime"
                value={kpi.uptime}
                subtext="Since last boot"
                Icon={Clock}
                iconColor="var(--color-unifi-blue)"
            />
            <KPICard
                title="Online Devices"
                value={`${kpi.onlineCount} / ${kpi.totalCount} total`}
                subtext={onlineWarning ? `${kpi.totalCount - kpi.onlineCount} devices offline` : 'Everything is optimal'}
                alert={onlineWarning}
                Icon={Network}
                iconColor={onlineWarning ? 'var(--color-alert)' : 'var(--color-success)'}
            />
            <KPICard
                title="Total WAN Traffic"
                value={`${kpi.traffic.toFixed(2)} TB`}
                subtext="Cumulative usage"
                Icon={Activity}
                iconColor="var(--color-unifi-blue)"
            />
            <KPICard
                title="Pending Updates"
                value={kpi.pendingUpdates}
                subtext={kpi.pendingUpdates > 0 ? "Critical security patches" : "Up to date"}
                subtextColor={kpi.pendingUpdates > 0 ? "var(--text-secondary)" : "var(--color-success)"} // Prompt shows grey text for this one usually, or let's match the ref image logic. Ref shows "Critical security patches" in grey.
                Icon={Smartphone}
                iconColor={kpi.pendingUpdates > 0 ? "var(--color-warning)" : "var(--color-success)"}
            />
        </div>
    );
};
