const ANA = require('./ana')
const http = require('http')
const mail = require('../mail').events
const server = require('./server')
const tape = require('tape')
const webdriver = require('./webdriver')

const path = '/handle'
const handle = ANA.handle
const email = ANA.email

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
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#signin'))
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
    mail.once('sent', options => {
      test.equal(options.to, email, 'sent mail')
      test.assert(options.text.includes(handle), 'mailed handle')
      finish()
    })
    function finish () {
      test.end()
      done()
    }
  })
})
