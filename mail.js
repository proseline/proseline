// Send e-mail.

// In production, send mail via SMTP.
/* istanbul ignore if */
if (process.env.NODE_ENV === 'production') {
  const nodemailer = require('nodemailer')
  const transport = nodemailer.createTransport({
    pool: true,
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  })
  module.exports = (data, callback) => {
    data.from = process.env.SMTP_USER
    transport.sendMail(data, callback)
  }
// In testing, mock e-mail, exposing an Event Emitter that
// tests can uses to intercept e-mails and their contents.
} else {
  const emitter = require('./test-events')
  module.exports = (options, callback) => {
    // This delay prevents tests from visiting account-confirmation
    // pages before the app has time to index the tokens.
    setTimeout(() => {
      emitter.emit('sent', options)
      callback()
    }, 1000)
  }
  module.exports.events = emitter
}
