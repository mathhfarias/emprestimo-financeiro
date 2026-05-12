import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import LoadingScreen from '../components/ui/LoadingScreen.jsx';

export default function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingScreen text="Verificando sessão..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
