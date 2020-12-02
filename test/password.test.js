import events from '../test-events.js'
import interactive from './interactive.js'
import logout from './logout.js'
import signup from './signup.js'
import verifyLogIn from './verify-login.js'

interactive('change password', async ({ browser, port, test }) => {
  const handle = 'tester'
  const oldPassword = 'old password'
  const newPassword = 'new password'
  const email = 'tester@example.com'
  // Sign up with old password.
  await signup({ browser, port, handle, password: oldPassword, email })
  // Log in with old password.
  await login({ handle, password: oldPassword })
  // Navigate to password-change form.
  const change = await browser.$('a=Change Password')
  await change.click()
  // Submit password-change form.
  const passwordForm = '#passwordForm'
  const changeOldInput = await browser.$(`${passwordForm} input[name="old"]`)
  await changeOldInput.addValue(oldPassword)
  const changePasswordInput = await browser.$(`${passwordForm} input[name="password"]`)
  await changePasswordInput.addValue(newPassword)
  const changeRepeat = await browser.$(`${passwordForm} input[name="repeat"]`)
  await changeRepeat.addValue(newPassword)
  await Promise.all([
    new Promise((resolve, reject) => {
      events.once('sent', ({ to, subject }) => {
        test.equal(to, email, 'email')
        test.assert(subject.includes('Password'), 'Password')
        resolve()
      })
    }),
    (async () => {
      const changeSubmitButton = await browser.$(`${passwordForm} button[type="submit"]`)
      await changeSubmitButton.click()
    })()
  ])
  const message = await browser.$('p.message')
  const text = await message.getText()
  test.assert(text.includes('changed'), 'changed')
  // Log out.
  await logout({ browser, port })
  // Log in with new password.
  await login({ handle, password: newPassword })
  await verifyLogIn({ browser, test, port, handle, email })

  async function login ({ handle, password }) {
    await browser.navigateTo('http://localhost:' + port)
    const login = await browser.$('#login')
    await login.click()
    const loginForm = '#loginForm'
    const handleInput = await browser.$(`${loginForm} input[name="handle"]`)
    await handleInput.addValue(handle)
    const passwordInput = await browser.$(`${loginForm} input[name="password"]`)
    await passwordInput.addValue(password)
    const submitButton = await browser.$(`${loginForm} button[type="submit"]`)
    await submitButton.click()
  }
})
