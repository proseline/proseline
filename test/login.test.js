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

interactive('browse ' + path, async ({ browser, port, test }) => {
  await browser.navigateTo('http://localhost:' + port)
  const login = await browser.$('#login')
  await login.click()
  const h2 = await browser.$('h2')
  const text = await h2.getText()
  test.equal(text, 'Log In', '<h2>Log In</h2>')
})

interactive('sign in', async ({ browser, port, test }) => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  await signup({ browser, port, handle, password, email })
  await browser.navigateTo('http://localhost:' + port)
  const login = await browser.$('#login')
  await login.click()
  const handleInput = await browser.$('#loginForm input[name="handle"]')
  await handleInput.addValue(handle)
  const passwordInput = await browser.$('#loginForm input[name="password"]')
  await passwordInput.addValue(password)
  const submitButton = await browser.$('#loginForm button[type="submit"]')
  await submitButton.click()
  await verifyLogIn({ browser, port, test, handle, email })
})

interactive('sign in with bad credentials', async ({ browser, port, test }) => {
  await browser.navigateTo('http://localhost:' + port)
  const login = await browser.$('#login')
  await login.click()
  const handleInput = await browser.$('#loginForm input[name="handle"]')
  await handleInput.addValue('invalid')
  const passwordInput = await browser.$('#loginForm input[name="password"]')
  await passwordInput.addValue('invalid')
  const submitButton = await browser.$('#loginForm button[type="submit"]')
  await submitButton.click()
  const p = await browser.$('p.error')
  const text = await p.getText()
  test.assert(text.includes('invalid'), 'invalid')
})

interactive('lockout', async ({ browser, port, test }) => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  await signup({ browser, port, handle, password, email })
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword('invalid', 'invalid handle or password')
  await loginWithPassword(password, 'account locked')
  async function loginWithPassword (password, message) {
    await browser.navigateTo('http://localhost:' + port)
    const login = await browser.$('#login')
    await login.click()
    const handleInput = await browser.$('#loginForm input[name="handle"]')
    await handleInput.addValue(handle)
    const passwordInput = await browser.$('#loginForm input[name="password"]')
    await passwordInput.addValue(password)
    const submitButton = await browser.$('#loginForm button[type="submit"]')
    await submitButton.click()
    const p = await browser.$('p.error')
    const text = await p.getText()
    test.equal(text, message, message)
  }
})
