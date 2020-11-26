const http = require('http')
const mail = require('../mail').events
const server = require('./server')
const signup = require('./signup')
const tape = require('tape')
const webdriver = require('./webdriver')

const path = '/handle'

const handle = 'ana'
const password = 'ana password'
const email = 'ana@example.com'

tape('GET ' + path, test => {
  server((port, done) => {
    http.request({ path, port })
      .once('response', response => {
        test.equal(response.statusCode, 200, '200')
        test.end()
        done()
      })
      .end()
  })
})

tape('discover handle', test => {
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => {
        return new Promise((resolve, reject) => signup({
          browser, port, handle, password, email
        }, error => {
          if (error) reject(error)
          mail.once('sent', ({ to, text }) => {
            test.equal(to, email, 'sent mail')
            test.assert(text.includes(handle), 'mailed handle')
            finish()
          })
          resolve()
        }))
      })
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#login'))
      .then(a => a.click())
      .then(() => browser.$('a=Forgot Handle'))
      .then(a => a.click())
      .then(() => browser.$('#handleForm input[name="email"]'))
      .then(input => input.addValue(email))
      .then(() => browser.$('#handleForm button[type="submit"]'))
      .then(submit => submit.click())
      .catch(error => {
        test.fail(error, 'catch')
        finish()
      })
    function finish () {
      test.end()
      done()
    }
  })
})
