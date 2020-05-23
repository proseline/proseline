const ANA = require('./ana')
const BOB = require('./bob')
const http = require('http')
const signin = require('./signin')
const signout = require('./signout')
const server = require('./server')
const tape = require('tape')
const verifySignIn = require('./verify-signin')
const webdriver = require('./webdriver')

const path = '/signout'

tape('GET ' + path, test => {
  server((port, done) => {
    http.request({ path, port })
      .once('response', response => {
        test.equal(response.statusCode, 405, '405')
        test.end()
        done()
      })
      .end()
  })
})

tape('log out', test => {
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
      .then(() => verifySignIn({
        browser,
        port,
        test,
        handle: ANA.handle,
        email: ANA.email
      }))
      .then(() => browser.$('#signout'))
      .then(element => element.click())
      .then(() => browser.navigateTo('http://localhost:' + port + '/edit'))
      .then(() => browser.$('h2'))
      .then(h2 => h2.getText())
      .then(text => test.equal(text, 'Log In', 'Log In'))
      .then(finish)
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

tape('log in as ana, log in as bob', test => {
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
      .then(() => verifySignIn({
        browser,
        port,
        test,
        handle: ANA.handle,
        email: ANA.email
      }))
      .then(() => signout({ browser, port }))
      .then(() => signin({
        browser,
        port,
        handle: BOB.handle,
        password: BOB.password
      }))
      .then(() => verifySignIn({
        browser,
        port,
        test,
        handle: BOB.handle,
        email: BOB.email
      }))
      .then(finish)
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
