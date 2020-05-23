const ANA = require('./ana')
const BOB = require('./bob')
const mail = require('../mail').events
const server = require('./server')
const signin = require('./signin')
const signup = require('./signup')
const tape = require('tape')
const webdriver = require('./webdriver')

tape('change e-mail', test => {
  const handle = 'tester'
  const password = 'test password'
  const oldEMail = 'old@example.com'
  const newEMail = 'new@example.com'
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => {
        signup({
          browser, port, handle, password, email: oldEMail
        }, error => {
          test.ifError(error, 'no signup error')
          browser.navigateTo('http://localhost:' + port)
            // Navigate to log-in page.
            .then(() => browser.$('#signin'))
            .then(a => a.click())
            // Sign in.
            .then(() => browser.$('#signinForm input[name="handle"]'))
            .then(input => input.addValue(handle))
            .then(() => browser.$('#signinForm input[name="password"]'))
            .then(input => input.addValue(password))
            .then(() => browser.$('#signinForm button[type="submit"]'))
            .then(submit => submit.click())
            // Navigate to password-change page.
            .then(() => browser.$('a=Account'))
            .then(a => a.click())
            .then(() => browser.$('a=Change E-Mail'))
            .then(a => a.click())
            // Submit password-change form.
            .then(() => browser.$('#emailForm input[name="email"]'))
            .then(input => input.addValue(newEMail))
            .then(() => {
              mail.once('sent', options => {
                test.equal(options.to, newEMail, 'TO: new email')
                test.assert(options.subject.includes('Confirm'), 'Confirm')
                const url = /http:\/\/[^ ]+/.exec(options.text)[0]
                browser.navigateTo(url)
                  .then(() => browser.$('p.message'))
                  .then(p => p.getText())
                  .then(text => {
                    test.assert(text.includes('changed'), 'changed')
                    test.end()
                    done()
                  })
              })
            })
            .then(() => browser.$('#emailForm button[type="submit"]'))
            .then(submit => submit.click())
            .catch(error => {
              test.fail(error, 'catch')
              finish()
            })
        })
      })
    function finish () {
      test.end()
      done()
    }
  })
})

tape('change e-mail to existing', test => {
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => signin({
        browser,
        port,
        handle: ANA.handle,
        password: ANA.password
      }))
      // Navigate to password-change page.
      .then(() => browser.$('a=Account'))
      .then(a => a.click())
      .then(() => browser.$('a=Change E-Mail'))
      .then(a => a.click())
      // Submit password-change form.
      .then(() => browser.$('#emailForm input[name="email"]'))
      .then(input => input.addValue(BOB.email))
      .then(() => browser.$('#emailForm button[type="submit"]'))
      .then(submit => submit.click())
      .then(() => browser.$('.error'))
      .then(element => element.getText())
      .then(text => { test.assert(text.includes('already has'), 'already has') })
      .then(finish)
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
