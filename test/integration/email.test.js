import events from '../../test-events.js'
import login from './login.js'
import signup from './signup.js'
import verifyLogIn from './verify-login.js'
import interactive from './interactive.js'

interactive('change e-mail', async ({ page, port, test }) => {
  const handle = 'tester'
  const password = 'test password'
  const oldEMail = 'old@example.com'
  const newEMail = 'new@example.com'
  // Sign up.
  await signup({ page, port, handle, password, email: oldEMail })
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email: oldEMail })
  // Navigate to password-change page.
  await page.goto('http://localhost:' + port)
  await page.click('text="Change E-Mail"')
  // Submit password-change form.
  await page.fill('#emailForm input[name="email"]', newEMail)
  let confirmURL
  await Promise.all([
    page.click('#emailForm button[type="submit"]'),
    new Promise((resolve, reject) => {
      events.once('sent', ({ to, subject, text }) => {
        test.equal(to, newEMail, 'TO: new email')
        test.assert(subject.includes('Confirm'), 'Confirm')
        confirmURL = /<(http:\/\/[^ ]+)>/.exec(text)[1]
        resolve()
      })
    })
  ])
  // Confirm.
  await page.goto(confirmURL)
  const message = await page.textContent('p.message')
  test.assert(message.includes('changed'), 'changed')
})

interactive('change e-mail to existing', async ({ page, port, test }) => {
  const handle = 'tester'
  const password = 'test password'
  const email = 'test@example.com'
  await signup({ page, port, handle, password, email })
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email })
  // Navigate to e-mail-change page.
  await page.goto('http://localhost:' + port)
  await page.click('text="Change E-Mail"')
  // Submit form with existing e-mail.
  const emailForm = '#emailForm'
  await page.fill(`${emailForm} input[name="email"]`, email)
  await page.click(`${emailForm} button[type="submit"]`)
  // Confirm error.
  const error = await page.textContent('.error')
  test.assert(error.includes('already has'), 'already has')
})
