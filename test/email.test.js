import events from '../test-events.js'
import login from './login.js'
import signup from './signup.js'
import verifyLogIn from './verify-login.js'
import interactive from './interactive.js'

interactive('change e-mail', async ({ browser, port, test }) => {
  const handle = 'tester'
  const password = 'test password'
  const oldEMail = 'old@example.com'
  const newEMail = 'new@example.com'
  // Sign up.
  await signup({ browser, port, handle, password, email: oldEMail })
  await login({ browser, port, handle, password })
  await verifyLogIn({ browser, port, test, handle, email: oldEMail })
  // Navigate to password-change page.
  await browser.navigateTo('http://localhost:' + port)
  const change = await browser.$('a=Change E-Mail')
  await change.click()
  // Submit password-change form.
  const eMailInput = await browser.$('#emailForm input[name="email"]')
  await eMailInput.addValue(newEMail)
  let confirmURL
  await Promise.all([
    (async () => {
      const submit = await browser.$('#emailForm button[type="submit"]')
      await submit.click()
    })(),
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
  await browser.navigateTo(confirmURL)
  const p = await browser.$('p.message')
  const text = await p.getText()
  test.assert(text.includes('changed'), 'changed')
})

interactive('change e-mail to existing', async ({ browser, port, test }) => {
  const handle = 'tester'
  const password = 'test password'
  const email = 'test@example.com'
  await signup({ browser, port, handle, password, email })
  await login({ browser, port, handle, password })
  await verifyLogIn({ browser, port, test, handle, email })
  // Navigate to password-change page.
  await browser.navigateTo('http://localhost:' + port)
  const change = await browser.$('a=Change E-Mail')
  await change.click()
  // Submit password-change form.
  const eMailInput = await browser.$('#emailForm input[name="email"]')
  await eMailInput.setValue(email)
  const submitButton = await browser.$('#emailForm button[type="submit"]')
  await submitButton.click()
  const p = await browser.$('.error')
  const text = await p.getText()
  test.assert(text.includes('already has'), 'already has')
})
