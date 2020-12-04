import login from './login.js'
import signup from './signup.js'
import subscribe from './subscribe.js'
import interactive from './interactive.js'
import verifyLogIn from './verify-login.js'

interactive('subscribe and unsubscribe', async ({ page, port, test }) => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'

  await signup({ page, port, handle, password, email })
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email })
  await subscribe({ page, port, test })

  // Unsubscribe.
  await page.goto('http://localhost:' + port)
  await page.click('#subscription')

  // Confirm.
  await page.click('text="Cancel plan"')
  await page.click('button[data-test="confirm"]')

  await page.waitForSelector('text="No current plans."')
  test.pass('canceled plan')

  await page.goto('http://localhost:' + port)
  await page.waitForSelector('#subscribe')
  test.pass('no longer subscribed')
})
