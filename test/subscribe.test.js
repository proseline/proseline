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
      .then(() => browser.$('iframe'))
      .then(frame => browser.switchToFrame(frame))
      .then(() => browser.$('input[name="cardnumber"]'))
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
      .then(() => browser.$('input[name="exp-date"]'))
      .then(input => input.setValue('10 / 31'))
      .then(() => browser.$('input[name="cvc"]'))
      .then(input => input.setValue('123'))
      .then(() => browser.$('input[name="postal"]'))
      .then(input => input.setValue('12345'))
      .then(() => browser.switchToParentFrame())

      // Submit
      .then(() => browser.$('#subscribeForm button[type="submit"]'))
      .then(element => element.click())

      // Confirm
      .then(() => browser.$('.message'))
      .then(element => element.waitForExist({ timeout: 10000 }))
      .then(() => browser.$('.message'))
      .then(element => element.getText())
      .then(text => test.assert(text.includes('Thank you'), 'subscribed'))

      // Unsubscribe
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#unsubscribe'))
      .then(a => a.click())

      // Submit
      .then(() => browser.$('#unsubscribeForm button[type="submit"]'))
      .then(element => element.click())

      // Confirm
      .then(() => browser.$('.message'))
      .then(element => element.waitForExist({ timeout: 10000 }))
      .then(() => browser.$('.message'))
      .then(element => element.getText())
      .then(text => test.assert(text.includes('unsubscribed'), 'unsubscribed'))

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
