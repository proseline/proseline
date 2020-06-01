const login = require('./login')
const server = require('./server')
const signup = require('./signup')
const tape = require('tape')
const timeout = require('./timeout')
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

    await browser.navigateTo('http://localhost:' + port)
    const subscribe = await browser.$('#subscribe')
    await subscribe.click()

    // Enter Payment Details
    const cardNumber = await browser.$('#cardNumber')
    await cardNumber.addValue('42')
    await timeout(200)
    await cardNumber.addValue('42')
    await timeout(200)
    await cardNumber.addValue('42')
    await timeout(200)
    await cardNumber.addValue('42')
    await timeout(200)
    await cardNumber.addValue('42')
    await timeout(200)
    await cardNumber.addValue('42')
    await timeout(200)
    await cardNumber.addValue('42')
    await timeout(200)
    await cardNumber.addValue('42')

    const expiry = await browser.$('#cardExpiry')
    await expiry.setValue('10 / 31')

    const cvc = await browser.$('#cardCvc')
    await cvc.setValue('123')

    const name = await browser.$('#billingName')
    await name.setValue('Joe Customer')

    const zip = await browser.$('#billingPostalCode')
    await zip.setValue('12345')

    const submit = await browser.$('button[type=submit]')
    await submit.click()

    // Confirm
    const message = await browser.$('.message')
    await message.waitForExist({ timeout: 20000 })
    const messageText = await message.getText()
    test.assert(messageText.includes('Thank you'), 'subscribed')

    // Unsubscribe
    await browser.navigateTo('http://localhost:' + port)
    const subscription = await browser.$('#subscription')
    await subscription.click()

    // Confirm
    const cancel = await browser.$('button[data-test="cancel-subscription"]')
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
