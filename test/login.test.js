import http from 'http'
import interactive from './interactive.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'
import verifyLogIn from './verify-login.js'

const path = '/login'

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

interactive('browse ' + path, async ({ page, port, test }) => {
  await page.goto('http://localhost:' + port)
  await page.click('#login')
  const text = await page.textContent('h2')
  test.equal(text, 'Log In', '<h2>Log In</h2>')
})

interactive('sign in', async ({ page, port, test }) => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  await signup({ page, port, handle, password, email })
  await page.goto('http://localhost:' + port)
  await page.click('#login')
  await page.fill('#loginForm input[name="handle"]', handle)
  await page.fill('#loginForm input[name="password"]', password)
  await page.click('#loginForm button[type="submit"]')
  await verifyLogIn({ page, port, test, handle, email })
})

interactive('sign in with bad credentials', async ({ page, port, test }) => {
  await page.goto('http://localhost:' + port)
  await page.click('#login')
  await page.fill('#loginForm input[name="handle"]', 'invalid')
  await page.fill('#loginForm input[name="password"]', 'invalid')
  await page.click('#loginForm button[type="submit"]')
  const text = await page.textContent('p.error')
  test.assert(text.includes('invalid'), 'invalid')
})

interactive('lockout', async ({ page, port, test }) => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  await signup({ page, port, handle, password, email })
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword(password, 'account locked')

  async function loginWithPassword (password, message) {
    await page.goto('http://localhost:' + port)
    await page.click('#login')
    await page.fill('#loginForm input[name="handle"]', handle)
    await page.fill('#loginForm input[name="password"]', password)
    await page.click('#loginForm button[type="submit"]')
    const text = await page.textContent('p.error')
    test.equal(text, message, message)
  }
})
