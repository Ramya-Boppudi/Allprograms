const REGISTER_ROLES = ['admin'];

const MONITOR_ROLES = ['chairman', 'ceo', 'aceo', 'cao', 'asst_secretary', 'pro'];

function isRegistrar(role) {
  return REGISTER_ROLES.includes(role);
}

function canSeeAll(role) {
  return MONITOR_ROLES.includes(role);
}

module.exports = { REGISTER_ROLES, MONITOR_ROLES, isRegistrar, canSeeAll };
