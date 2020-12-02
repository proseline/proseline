// Send e-mail.

import emitter from './test-events.js'

let nodemailer, transport

/* istanbul ignore if */
if (process.env.NODE_ENV === 'production') {
  nodemailer = require('nodemailer')
  transport = nodemailer.createTransport({
    pool: true,
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  })
}

export default (options, callback) => {
  // In production, send mail via SMTP.
  if (process.env.NODE_ENV === 'production') {
    options.from = process.env.SMTP_USER
    transport.sendMail(options, callback)
  // In testing, mock e-mail, exposing an Event Emitter that
  // tests can uses to intercept e-mails and their contents.
  } else {
    // This delay prevents tests from visiting account-confirmation
    // pages before the app has time to index the tokens.
    setTimeout(() => {
      emitter.emit('sent', options)
      callback()
    }, 1000)
  }
}
