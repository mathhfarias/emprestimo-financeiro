import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import Login from '../pages/Login.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Clients from '../pages/Clients.jsx';
import ClientDetails from '../pages/ClientDetails.jsx';
import Loans from '../pages/Loans.jsx';
import LoanDetails from '../pages/LoanDetails.jsx';
import Financial from '../pages/Financial.jsx';
import Settings from '../pages/Settings.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/clientes/:id" element={<ClientDetails />} />
          <Route path="/emprestimos" element={<Loans />} />
          <Route path="/emprestimos/:id" element={<LoanDetails />} />
          <Route path="/financeiro" element={<Financial />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
