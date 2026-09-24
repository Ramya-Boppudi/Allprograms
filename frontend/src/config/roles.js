export const REGISTER_ROLES = ['admin'];

export const MONITOR_ROLES = ['chairman', 'ceo', 'aceo', 'cao', 'asst_secretary', 'pro'];

export const ROLE_LABEL = {
  chairman: 'Chairman, KSBA',
  ceo: 'Chief Executive Officer, KSBA',
  aceo: 'Additional CEO, KSBA',
  cao: 'Chief Accounts Officer, KSBA',
  asst_secretary: 'Assistant Secretary, KSBA',
  pro: 'Public Relation Officer',
  admin: 'Admin',
  divisional_manager: 'Divisional Manager',
};

export function canRegisterGrievance(role) {
  return REGISTER_ROLES.includes(role);
}

export function canMonitorAll(role) {
  return MONITOR_ROLES.includes(role);
}

export function filterOwnRegistrations(rows, user) {
  if (!user?.id) return [];
  return (rows || []).filter((row) => Number(row.created_by_staff_id) === Number(user.id));
}

export function forwardedByLabel(row) {
  if (row?.created_by_name) return row.created_by_name;
  if (row?.created_by_role && ROLE_LABEL[row.created_by_role]) {
    return ROLE_LABEL[row.created_by_role];
  }
  if (row?.filed_by === 'PUBLIC') return 'Public portal';
  return '—';
}
