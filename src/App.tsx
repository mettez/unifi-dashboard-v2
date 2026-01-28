import { DashboardProvider } from './context/DashboardContext';
import { Layout } from './components/Layout/Layout';
import { KPIHeader } from './components/KPI/KPIHeader';
import { DeviceTable } from './components/Devices/DeviceTable';

const DashboardContent = () => {
  return (
    <Layout>
      <div className="main-content">
        <KPIHeader />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', alignItems: 'start' }}>
          <DeviceTable type="Switch" title="Switches" />
          <DeviceTable type="AP" title="Access Points" />
        </div>

      </div>
    </Layout>
  );
};

function App() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}

export default App
