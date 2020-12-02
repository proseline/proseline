// Send e-mails based on templates.

import mail from './mail.js'
import markdown from './markdown.js'

export const confirmAccount = ({ to, handle, url }, callback) => {
  send({
    to,
    subject: 'Confirm Proseline Account',
    markup: `
Follow this link to confirm your Proseline account:

<${url}>
    `.trim()
  }, callback)
}

export const passwordReset = ({ to, handle, url }, callback) => {
  send({
    to,
    subject: 'Reset Proseline Password',
    markup: `
To reset the password for your Proseline account, follow this link:

<${url}>
    `.trim()
  }, callback)
}

export const passwordChanged = ({ to }, callback) => {
  send({
    to,
    subject: 'Proseline Password Change',
    markup: `
The password for your Proseline account on was changed.
    `.trim()
  }, callback)
}

export const handleReminder = ({ to, handle }, callback) => {
  send({
    to,
    subject: 'Your Proseline Handle',
    markup: `Your handle on Proseline is "${handle}".`
  }, callback)
}

export const confirmEMailChange = ({ to, url }, callback) => {
  send({
    to,
    subject: 'Confirm E-Mail Change',
    markup: `
To confirm the new e-mail address for your Proseline account, follow this link:

<${url}>
    `.trim()
  }, callback)
}

// Send e-mail as plain text and HTML from Markdown source.
function send ({ to, subject, markup }, callback) {
  mail({
    to,
    subject,
    text: markup,
    html: markdown(markup)
  }, callback)
}
