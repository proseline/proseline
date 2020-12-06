import events from '../../test-events.js'
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

interactive('discover handle', async ({ page, port, test }) => {
  await signup({ page, port, handle, password, email })
  await Promise.all([
    new Promise((resolve, reject) => {
      events.once('sent', ({ to, text }) => {
        test.equal(to, email, 'sent mail')
        test.assert(text.includes(handle), 'mailed handle')
        resolve()
      })
    }),
    (async () => {
      await page.goto('http://localhost:' + port)
      await page.click('#login')
      await page.click('text="Forgot Handle"')
      await page.fill('#handleForm input[name="email"]', email)
      await page.click('#handleForm button[type="submit"]')
    })()
  ])
})
