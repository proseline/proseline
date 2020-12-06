import events from '../../test-events.js'
import interactive from './interactive.js'
import logout from './logout.js'
import signup from './signup.js'
import verifyLogIn from './verify-login.js'

interactive('change password', async ({ page, port, test }) => {
  const handle = 'tester'
  const oldPassword = 'old password'
  const newPassword = 'new password'
  const email = 'tester@example.com'
  // Sign up with old password.
  await signup({ page, port, handle, password: oldPassword, email })
  // Log in with old password.
  await login({ handle, password: oldPassword })
  // Navigate to password-change form.
  await page.click('text="Change Password"')
  // Submit password-change form.
  const passwordForm = '#passwordForm'
  await page.fill(`${passwordForm} input[name="old"]`, oldPassword)
  await page.fill(`${passwordForm} input[name="password"]`, newPassword)
  await page.fill(`${passwordForm} input[name="repeat"]`, newPassword)
  await Promise.all([
    new Promise((resolve, reject) => {
      events.once('sent', ({ to, subject }) => {
        test.equal(to, email, 'email')
        test.assert(subject.includes('Password'), 'Password')
        resolve()
      })
    }),
    page.click(`${passwordForm} button[type="submit"]`)
  ])
  const text = await page.textContent('p.message')
  test.assert(text.includes('changed'), 'changed')
  // Log out.
  await logout({ page, port })
  // Log in with new password.
  await login({ handle, password: newPassword })
  await verifyLogIn({ page, test, port, handle, email })

  async function login ({ handle, password }) {
    await page.goto('http://localhost:' + port)
    await page.click('#login')
    const loginForm = '#loginForm'
    await page.fill(`${loginForm} input[name="handle"]`, handle)
    await page.fill(`${loginForm} input[name="password"]`, password)
    await page.click(`${loginForm} button[type="submit"]`)
  }
})
