/**
 * Rejects the request when the admin user is missing or inactive.
 * Route permissions are enforced separately by admin::hasPermissions.
 */
const isAuthenticatedAdmin = (policyContext: { state?: { user?: { isActive?: boolean } } }) => {
  const user = policyContext.state?.user
  if (!user || user.isActive === false) {
    return false
  }
  return true
}

export default isAuthenticatedAdmin
