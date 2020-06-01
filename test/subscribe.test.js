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
  server((port, done) => {
    let browser, cardNumber
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => new Promise((resolve, reject) => {
        signup({
          browser, port, handle, password, email
        }, error => {
          if (error) return reject(error)
          resolve()
        })
      }))
      .then(() => login({ browser, port, handle, password }))
      .then(() => verifyLogIn({ browser, port, test, handle, email }))
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#subscribe'))
      .then(a => a.click())

      // Enter Payment Details
      .then(() => browser.$('#cardNumber'))
      .then(input => { cardNumber = input })
      .then(() => cardNumber.addValue('42'))
      .then(() => timeout(200))
      .then(() => cardNumber.addValue('42'))
      .then(() => timeout(200))
      .then(() => cardNumber.addValue('42'))
      .then(() => timeout(200))
      .then(() => cardNumber.addValue('42'))
      .then(() => timeout(200))
      .then(() => cardNumber.addValue('42'))
      .then(() => timeout(200))
      .then(() => cardNumber.addValue('42'))
      .then(() => timeout(200))
      .then(() => cardNumber.addValue('42'))
      .then(() => timeout(200))
      .then(() => cardNumber.addValue('42'))
      .then(() => browser.$('#cardExpiry'))
      .then(input => input.setValue('10 / 31'))
      .then(() => browser.$('#cardCvc'))
      .then(input => input.setValue('123'))
      .then(() => browser.$('#billingName'))
      .then(input => input.setValue('Joe Customer'))
      .then(() => browser.$('#billingPostalCode'))
      .then(input => input.setValue('12345'))
      .then(() => browser.$('button[type=submit]'))
      .then(button => button.click())

      // Confirm
      .then(() => browser.$('.message'))
      .then(element => element.waitForExist({ timeout: 20000 }))
      .then(() => browser.$('.message'))
      .then(element => element.getText())
      .then(text => test.assert(text.includes('Thank you'), 'subscribed'))

      // Unsubscribe
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#subscription'))
      .then(a => a.click())

      // Confirm
      .then(() => browser.$('button[data-test="cancel-subscription"]'))
      .then(button => button.click())
      .then(() => browser.$('button[data-test="confirm"]'))
      .then(button => button.click())
      .then(() => browser.$('span=No current plans.'))
      .then(element => element.waitForExist({ timeout: 10000 }))
      .then(() => browser.$('span=No current plans.'))
      .then(element => element.isExisting())
      .then(existing => test.assert(existing, 'canceled plan'))

      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#subscribe'))
      .then(element => element.waitForExist({ timeout: 10000 }))
      .then(() => browser.$('#subscribe'))
      .then(element => element.isExisting())
      .then(existing => test.assert(existing, 'no longer subscribed'))

      .then(() => { finish() })
      .catch(error => {
        test.fail(error)
        finish()
      })
    function finish () {
      test.end()
      done()
    }
  })
})
