export function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.FITALL_DEV_AUTH_BYPASS !== '0'
}
