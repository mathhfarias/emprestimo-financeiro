import { useAuth } from '../../contexts/AuthContext.jsx';

export default function PermissionGate({
  permission,
  children,
  fallback = null,
}) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return children;
}