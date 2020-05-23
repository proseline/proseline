const mail = require('./mail')
const markdown = require('./markdown')

exports.confirmAccount = ({ to, handle, url }, callback) => {
  const text = `
  `.trim()
  const html = markdown(text)
  send({
    to,
    subject: 'Confirm Proseline Account',
    markup: `
Follow this link to confirm your Proseline account:

<${url}>
    `.trim(),
    text,
    html
  }, callback)
}

exports.passwordReset = ({ to, handle, url }, callback) => {
  send({
    to,
    subject: 'Reset Proseline Password',
    markup: `
To reset the password for your Proseline account, follow this link:

<${url}>
    `.trim()
  }, callback)
}

exports.passwordChanged = ({ to }, callback) => {
  send({
    to,
    subject: 'Proseline Password Change',
    markup: `
The password for your Proseline account on was changed.
    `.trim()
  }, callback)
}

exports.confirmEMailChange = ({ to, url }, callback) => {
  send({
    to,
    subject: 'Confirm E-Mail Change',
    markup: `
To confirm the new e-mail address for your Proseline account, follow this link:

<${url}>
    `.trim()
  }, callback)
}

function send ({ to, subject, markup }, callback) {
  mail({
    to,
    text: markup,
    html: markdown(markup)
  })
}
