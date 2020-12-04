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

interactive('reset password', async ({ page, port, test }) => {
  const handle = 'tester'
  const password = 'test password'
  const email = 'tester@example.com'
  await signup({ page, port, handle, password, email })
  await page.goto('http://localhost:' + port)
  await page.click('#login')
  await page.click('text="Reset Password"')
  const resetForm = '#resetForm'
  await page.fill(`${resetForm} input[name="handle"]`, handle)
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
    page.click(`${resetForm} button[type="submit"]`)
  ])
  await page.goto(url)
  // Fill reset form.
  const passwordForm = '#passwordForm'
  await page.fill(`${passwordForm} input[name="password"]`, password)
  await page.fill(`${passwordForm} input[name="repeat"]`, password)
  await page.click(`${passwordForm} button[type="submit"]`)
  // Log in with new password.
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email })
})
