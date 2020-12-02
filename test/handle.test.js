import events from '../test-events.js'
import http from 'http'
import interactive from './interactive.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'

const path = '/handle'

const handle = 'ana'
const password = 'ana password'
const email = 'ana@example.com'

tap.test('GET ' + path, test => {
  server((port, done) => {
    test.teardown(done)
    http.request({ path, port })
      .once('response', response => {
        test.equal(response.statusCode, 200, '200')
        test.end()
      })
      .end()
  })
})

interactive('discover handle', async ({ browser, port, test }) => {
  await signup({ browser, port, handle, password, email })
  await Promise.all([
    new Promise((resolve, reject) => {
      events.once('sent', ({ to, text }) => {
        test.equal(to, email, 'sent mail')
        test.assert(text.includes(handle), 'mailed handle')
        resolve()
      })
    }),
    (async () => {
      await browser.navigateTo('http://localhost:' + port)
      const login = await browser.$('#login')
      await login.click()
      const forgot = await browser.$('a=Forgot Handle')
      await forgot.click()
      const eMailInput = await browser.$('#handleForm input[name="email"]')
      await eMailInput.addValue(email)
      const submitButton = await browser.$('#handleForm button[type="submit"]')
      await submitButton.click()
    })()
  ])
})
