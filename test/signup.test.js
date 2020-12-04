import events from '../test-events.js'
import http from 'http'
import interactive from './interactive.js'
import login from './login.js'
import server from './server.js'
import signup from './signup.js'
import tap from 'tap'
import verifyLogIn from './verify-login.js'

const path = '/signup'

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

interactive('browse ' + path, async ({ page, port, test }) => {
  await page.goto('http://localhost:' + port)
  await page.click('text="Sign Up"')
  const text = await page.textContent('h2')
  test.equal(text, 'Sign Up', '<h2>Sign Up</h2>')
})

interactive('sign up', async ({ page, port, test }) => {
  const email = 'test@example.com'
  const handle = 'tester'
  const password = 'test password'
  await page.goto('http://localhost:' + port)
  await page.click('text="Sign Up"')
  const signupForm = '#signupForm'
  await page.fill(`${signupForm} input[name="email"]`, email)
  await page.fill(`${signupForm} input[name="handle"]`, handle)
  await page.fill(`${signupForm} input[name="password"]`, password)
  await page.fill(`${signupForm} input[name="repeat"]`, password)
  let url
  await Promise.all([
    new Promise((resolve, reject) => {
      events.once('sent', ({ to, subject, text }) => {
        test.equal(to, email, 'sends e-mail')
        test.assert(subject.includes('Confirm'), 'subject')
        test.assert(text.includes('/confirm?token='), 'link')
        url = /<(http:\/\/[^ ]+)>/.exec(text)[1]
        resolve()
      })
    }),
    (async () => {
      await page.click(`${signupForm} button[type="submit"]`)
    })()
  ])
  await page.goto(url)
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email })
})

interactive('sign up same handle', async ({ page, port, test }) => {
  const firstEMail = 'first@example.com'
  const secondEMail = 'first@example.com'
  const handle = 'tester'
  const password = 'test password'

  // Sign up using the handle.
  await signup({ page, port, handle, password, email: firstEMail })

  // Try to sign up again with the same handle.
  await page.click('text="Sign Up"')
  const signupForm = '#signupForm'
  await page.fill(`${signupForm} input[name="email"]`, secondEMail)
  await page.fill(`${signupForm} input[name="handle"]`, handle)
  await page.fill(`${signupForm} input[name="password"]`, password)
  await page.fill(`${signupForm} input[name="repeat"]`, password)
  await page.click(`${signupForm} button[type="submit"]`)
  test.pass('signed up again with same handle')

  // Check for error.
  const errorText = await page.textContent('.error')
  test.assert(errorText.includes('taken'), 'handle taken')

  // Check that other form inputs remain filled.
  const eMailValue = await page.getAttribute(`${signupForm} input[name="email"]`, 'value')
  test.equal(eMailValue, secondEMail, 'preserves e-mail value')
  const handleValue = await page.getAttribute(`${signupForm} input[name="handle"]`, 'value')
  test.equal(handleValue, handle, 'preserves handle value')
  const passwordValue = await page.getAttribute(`${signupForm} input[name="password"]`, 'value')
  test.equal(passwordValue, null, 'empties password')
  const repeatValue = await page.getAttribute(`${signupForm} input[name="repeat"]`, 'value')
  test.equal(repeatValue, null, 'empties password repeat')
})

interactive('sign up same email', async ({ page, port, test }) => {
  const email = 'first@example.com'
  const firstHandle = 'first'
  const secondHandle = 'second'
  const password = 'test password'

  await signup({ page, port, handle: firstHandle, password, email })

  // Try to sign up again with the same e-mail.
  await page.goto('http://localhost:' + port)
  await page.click('text="Sign Up"')
  const signupForm = '#signupForm'
  await page.fill(`${signupForm} input[name="email"]`, email)
  await page.fill(`${signupForm} input[name="handle"]`, secondHandle)
  await page.fill(`${signupForm} input[name="password"]`, password)
  await page.fill(`${signupForm} input[name="repeat"]`, password)
  await page.click(`${signupForm} button[type="submit"]`)

  // Check for error.
  const errorText = await page.textContent('.error')
  test.assert(errorText.includes('e-mail'), 'e-mail')
})
