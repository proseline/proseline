const ANA = require('./ana')
const http = require('http')
const signin = require('./signin')
const server = require('./server')
const tape = require('tape')
const verifySignIn = require('./verify-signin')
const webdriver = require('./webdriver')

const path = '/account'

tape('GET ' + path, test => {
  server((port, done) => {
    http.request({ path, port })
      .once('response', response => {
        test.equal(response.statusCode, 302, '302')
        test.equal(response.headers.location, '/signin', 'redirect')
        test.end()
        done()
      })
      .end()
  })
})

tape('browse ' + path, test => {
  const email = ANA.email
  const handle = ANA.handle
  const password = ANA.password
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => signin({ browser, port, handle, password }))
      .then(() => verifySignIn({
        browser, test, port, email, handle
      }))
      .then(() => finish())
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
