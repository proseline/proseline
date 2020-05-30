module.exports = () => {
  const requiredEnvironmentVariables = [
    'BASE_HREF',
    'CSRF_KEY',
    'STRIPE_PLAN',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY'
  ]
  const missing = []
  requiredEnvironmentVariables.forEach(key => {
    if (!process.env[key]) missing.push(key)
  })
  return missing
}
