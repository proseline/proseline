import http from 'http'
import interactive from './interactive.js'
import login from './login.js'
import logout from './logout.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'
import verifyLogIn from './verify-login.js'

const path = '/logout'

tap.test('GET ' + path, test => {
  server((port, done) => {
    test.teardown(done)
    http.request({ path, port })
      .once('response', response => {
        test.equal(response.statusCode, 405, '405')
        test.end()
      })
      .end()
  })
})

interactive('log out', async ({ page, port, test }) => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  await signup({ page, port, handle, password, email })
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email })
  await page.click('#logout')
  await page.goto('http://localhost:' + port)
  const text = await page.textContent('#login')
  test.equal(text, 'Log In', 'Log In')
})

interactive('log in as ana, log in as bob', async ({ page, port, test }) => {
  const ana = {
    handle: 'ana',
    password: 'ana password',
    email: 'ana@example.com'
  }
  const bob = {
    handle: 'bob',
    password: 'bob password',
    email: 'bob@example.com'
  }
  await signup({
    page,
    port,
    handle: ana.handle,
    password: ana.password,
    email: ana.email
  })
  await signup({
    page,
    port,
    handle: bob.handle,
    password: bob.password,
    email: bob.email
  })
  await login({ page, port, handle: ana.handle, password: ana.password })
  await verifyLogIn({ page, port, test, handle: ana.handle, email: ana.email })
  await logout({ page, port })
  await login({ page, port, handle: bob.handle, password: bob.password })
  await verifyLogIn({ page, port, test, handle: bob.handle, email: bob.email })
})
