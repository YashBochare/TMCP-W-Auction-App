import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from '@auction/shared';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { CaptainPage } from './pages/CaptainPage';
import { AdminPage } from './pages/AdminPage';
import { ViewerPage } from './pages/ViewerPage';
import { EventSetup } from './pages/admin/EventSetup';
import { ConnectionStatus } from './components/ConnectionStatus';

function CaptainRoute() {
  const { user } = useAuth();
  if (user?.role === UserRole.CAPTAIN) return <CaptainPage />;
  return <LoginPage route="captain" redirectTo="/captain" />;
}

function AdminRoute({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === UserRole.AUCTIONEER) return <>{children || <AdminPage />}</>;
  return <LoginPage route="admin" redirectTo="/admin" />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConnectionStatus />
        <Routes>
          <Route path="/" element={<Navigate to="/viewer" replace />} />
          <Route path="/viewer" element={<ViewerPage />} />
          <Route path="/captain" element={<CaptainRoute />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/admin/setup" element={<AdminRoute><EventSetup /></AdminRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
