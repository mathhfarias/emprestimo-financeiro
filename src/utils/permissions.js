export const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.OPERATOR]: 'Operador',
  [ROLES.VIEWER]: 'Somente leitura',
};

export const PERMISSIONS = {
  CLIENT_CREATE: 'client:create',
  CLIENT_UPDATE: 'client:update',
  CLIENT_DELETE: 'client:delete',

  LOAN_CREATE: 'loan:create',
  LOAN_UPDATE: 'loan:update',
  LOAN_DELETE: 'loan:delete',

  INSTALLMENT_UPDATE: 'installment:update',
  PAYMENT_CREATE: 'payment:create',

  FINANCIAL_VIEW: 'financial:view',
  AUDIT_VIEW: 'audit:view',

  USER_MANAGE: 'user:manage',
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CLIENT_CREATE,
    PERMISSIONS.CLIENT_UPDATE,
    PERMISSIONS.CLIENT_DELETE,

    PERMISSIONS.LOAN_CREATE,
    PERMISSIONS.LOAN_UPDATE,
    PERMISSIONS.LOAN_DELETE,

    PERMISSIONS.INSTALLMENT_UPDATE,
    PERMISSIONS.PAYMENT_CREATE,

    PERMISSIONS.FINANCIAL_VIEW,
    PERMISSIONS.AUDIT_VIEW,

    PERMISSIONS.USER_MANAGE,
  ],

  [ROLES.OPERATOR]: [
    PERMISSIONS.CLIENT_CREATE,
    PERMISSIONS.CLIENT_UPDATE,

    PERMISSIONS.LOAN_CREATE,
    PERMISSIONS.LOAN_UPDATE,

    PERMISSIONS.INSTALLMENT_UPDATE,
    PERMISSIONS.PAYMENT_CREATE,

    PERMISSIONS.FINANCIAL_VIEW,
  ],

  [ROLES.VIEWER]: [
    PERMISSIONS.FINANCIAL_VIEW,
  ],
};

export function hasPermission(role, permission) {
  if (!role || !permission) return false;

  const permissions = ROLE_PERMISSIONS[role] || [];

  return permissions.includes(permission);
}

export function canWrite(role) {
  return role === ROLES.ADMIN || role === ROLES.OPERATOR;
}

export function isAdmin(role) {
  return role === ROLES.ADMIN;
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || 'Sem permissão';
}