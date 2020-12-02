import login from './login.js'
import signup from './signup.js'
import subscribe from './subscribe.js'
import interactive from './interactive.js'
import verifyLogIn from './verify-login.js'

interactive('subscribe and unsubscribe', async ({ browser, port, test }) => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'

  await signup({ browser, port, handle, password, email })
  await login({ browser, port, handle, password })
  await verifyLogIn({ browser, port, test, handle, email })
  await subscribe({ browser, port, test })

  // Unsubscribe.
  await browser.navigateTo('http://localhost:' + port)
  const subscription = await browser.$('#subscription')
  await subscription.click()

  // Confirm.
  const cancel = await browser.$('=Cancel plan')
  await cancel.click()

  const confirm = await browser.$('button[data-test="confirm"]')
  await confirm.click()

  const noPlan = await browser.$('span=No current plans.')
  await noPlan.waitForExist({ timeout: 10000 })
  const canceled = await noPlan.isExisting()
  test.assert(canceled, 'canceled plan')

  await browser.navigateTo('http://localhost:' + port)
  const subscribeAgain = await browser.$('#subscribe')
  await subscribeAgain.waitForExist({ timeout: 10000 })
  const notSubscribed = await subscribeAgain.isExisting()
  test.assert(notSubscribed, 'no longer subscribed')
})
