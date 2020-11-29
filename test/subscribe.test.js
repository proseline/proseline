const login = require('./login')
const server = require('./server')
const signup = require('./signup')
const subscribe = require('./subscribe')
const tape = require('tape')
const verifyLogIn = require('./verify-login')
const webdriver = require('./webdriver')

tape('subscribe and unsubscribe', test => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  server(async (port, done) => {
    const browser = await webdriver()

    await new Promise((resolve, reject) => {
      signup({
        browser, port, handle, password, email
      }, error => {
        if (error) return reject(error)
        resolve()
      })
    })
    await login({ browser, port, handle, password })
    await verifyLogIn({ browser, port, test, handle, email })
    await subscribe({ browser, port, test })

    // Unsubscribe
    await browser.navigateTo('http://localhost:' + port)
    const subscription = await browser.$('#subscription')
    await subscription.click()

    // Confirm
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

    test.end()
    done()
  })
})
