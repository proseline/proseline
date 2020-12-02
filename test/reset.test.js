import events from '../test-events.js'
import http from 'http'
import interactive from './interactive.js'
import login from './login.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'
import verifyLogIn from './verify-login.js'

const path = '/reset'

tap.test('GET ' + path, test => {
  server((port, done) => {
    http.request({ path, port })
      .once('response', response => {
        test.equal(response.statusCode, 200, '200')
        test.end()
        done()
      })
      .end()
  })
})

interactive('reset password', async ({ browser, port, test }) => {
  const handle = 'tester'
  const password = 'test password'
  const email = 'tester@example.com'
  await signup({ browser, port, handle, password, email })
  await browser.navigateTo('http://localhost:' + port)
  const loginLink = await browser.$('#login')
  await loginLink.click()
  const reset = await browser.$('a=Reset Password')
  await reset.click()
  const resetForm = '#resetForm'
  const handleInput = await browser.$(`${resetForm} input[name="handle"]`)
  await handleInput.addValue(handle)
  let url
  await Promise.all([
    new Promise((resolve, reject) => {
      events.once('sent', ({ to, subject, text }) => {
        test.equal(to, email, 'sent mail')
        test.assert(subject.includes('Reset'), 'reset')
        url = /<(http:\/\/[^ ]+)>/.exec(text)[1]
        resolve()
      })
    }),
    (async () => {
      const submit = await browser.$(`${resetForm} button[type="submit"]`)
      await submit.click()
    })()
  ])
  await browser.navigateTo(url)
  // Fill reset form.
  const passwordForm = '#passwordForm'
  const passwordInput = await browser.$(`${passwordForm} input[name="password"]`)
  await passwordInput.addValue(password)
  const repeatInput = await browser.$(`${passwordForm} input[name="repeat"]`)
  await repeatInput.addValue(password)
  const submitButton = await browser.$(`${passwordForm} button[type="submit"]`)
  await submitButton.click()
  // Log in with new password.
  await login({ browser, port, handle, password })
  await verifyLogIn({ browser, port, test, handle, email })
})
