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

interactive('browse ' + path, async ({ browser, port, test }) => {
  await browser.navigateTo('http://localhost:' + port)
  const signUp = await browser.$('a=Sign Up')
  await signUp.click()
  const h2 = await browser.$('h2')
  const text = await h2.getText()
  test.equal(text, 'Sign Up', '<h2>Sign Up</h2>')
})

interactive('sign up', async ({ browser, port, test }) => {
  const email = 'test@example.com'
  const handle = 'tester'
  const password = 'test password'
  await browser.navigateTo('http://localhost:' + port)
  const signUp = await browser.$('a=Sign Up')
  await signUp.click()
  const signupForm = '#signupForm'
  const eMailInput = await browser.$(`${signupForm} input[name="email"]`)
  await eMailInput.addValue(email)
  const handleInput = await browser.$(`${signupForm} input[name="handle"]`)
  await handleInput.addValue(handle)
  const passwordInput = await browser.$(`${signupForm} input[name="password"]`)
  await passwordInput.addValue(password)
  const repeatInput = await browser.$(`${signupForm} input[name="repeat"]`)
  await repeatInput.addValue(password)
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
      const submitButton = await browser.$('#signupForm button[type="submit"]')
      await submitButton.click()
    })()
  ])
  await browser.navigateTo(url)
  await login({ browser, port, handle, password })
  await verifyLogIn({ browser, port, test, handle, email })
})

interactive('sign up same handle', async ({ browser, port, test }) => {
  const firstEMail = 'first@example.com'
  const secondEMail = 'first@example.com'
  const handle = 'tester'
  const password = 'test password'

  // Sign up using the handle.
  await signup({ browser, port, handle, password, email: firstEMail })

  // Try to sign up again with the same handle.
  const signUp = await browser.$('a=Sign Up')
  await signUp.click()
  const signupForm = '#signupForm'
  const eMailInput = await browser.$(`${signupForm} input[name="email"]`)
  await eMailInput.addValue(secondEMail)
  const handleInput = await browser.$(`${signupForm} input[name="handle"]`)
  await handleInput.addValue(handle)
  const passwordInput = await browser.$(`${signupForm} input[name="password"]`)
  await passwordInput.addValue(password)
  const repeatInput = await browser.$(`${signupForm} input[name="repeat"]`)
  await repeatInput.addValue(password)
  const submitButton = await browser.$(`${signupForm} button[type="submit"]`)
  await submitButton.click()
  test.assert(true, 'signed up again with same handle')

  // Check for error.
  const error = await browser.$('.error')
  const text = await error.getText()
  test.assert(text.includes('taken'), 'handle taken')

  // Check that other form inputs remain filled.
  const newEMailInput = await browser.$(`${signupForm} input[name="email"]`)
  const eMailValue = await newEMailInput.getValue()
  test.equal(eMailValue, secondEMail, 'preserves e-mail value')
  const newHandleInput = await browser.$(`${signupForm} input[name="handle"]`)
  const handleValue = await newHandleInput.getValue()
  test.equal(handleValue, handle, 'preserves handle value')
  const newPasswordInput = await browser.$(`${signupForm} input[name="password"]`)
  const passwordValue = await newPasswordInput.getValue()
  test.equal(passwordValue, '', 'empties password')
  const newRepeatInput = await browser.$(`${signupForm} input[name="repeat"]`)
  const repeatValue = await newRepeatInput.getValue()
  test.equal(repeatValue, '', 'empties password repeat')
})

interactive('sign up same email', async ({ browser, port, test }) => {
  const email = 'first@example.com'
  const firstHandle = 'first'
  const secondHandle = 'second'
  const password = 'test password'

  await signup({ browser, port, handle: firstHandle, password, email })

  // Try to sign up again with the same e-mail.
  await browser.navigateTo('http://localhost:' + port)
  const signUp = await browser.$('a=Sign Up')
  await signUp.click()
  const eMailInput = await browser.$('#signupForm input[name="email"]')
  await eMailInput.addValue(email)
  const handleInput = await browser.$('#signupForm input[name="handle"]')
  await handleInput.addValue(secondHandle)
  const passwordInput = await browser.$('#signupForm input[name="password"]')
  await passwordInput.addValue(password)
  const repeatInput = await browser.$('#signupForm input[name="repeat"]')
  await repeatInput.addValue(password)
  const submitButton = await browser.$('#signupForm button[type="submit"]')
  await submitButton.click()

  // Check for error.
  const error = await browser.$('.error')
  const text = await error.getText()
  test.assert(text.includes('e-mail'), 'e-mail')
})
