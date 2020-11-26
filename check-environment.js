module.exports = () => {
  const requiredEnvironmentVariables = [
    'NODE_ENV',
    'BASE_HREF',
    'CSRF_KEY',
    'STRIPE_PLAN',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ]
  const productionEnvironmentVariables = [
    'ADMIN_EMAIL',
    'S3_ACCESS_KEY',
    'S3_BUCKET',
    'S3_ENDPOINT',
    'S3_SECRET_KEY',
    'SMTP_HOST',
    'SMTP_PASSWORD',
    'SMTP_USER'
  ]
  const missing = []
  requiredEnvironmentVariables.forEach(key => {
    if (!process.env[key]) missing.push(key)
  })
  if (process.env.NODE_ENV === 'production') {
    productionEnvironmentVariables.forEach(key => {
      if (!process.env[key]) missing.push(key)
    })
  }
  return missing
}
