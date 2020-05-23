const http = require('http')
const server = require('./server')
const signin = require('./signin')
const signout = require('./signout')
const signup = require('./signup')
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
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  server((port, done) => {
    let browser
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
      .then(() => signin({ browser, port, handle, password }))
      .then(() => verifySignIn({ browser, port, test, handle, email }))
      .then(() => browser.$('#signout'))
      .then(element => element.click())
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#signin'))
      .then(h2 => h2.getText())
      .then(text => test.equal(text, 'Sign In', 'Sign In'))
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
  const ana = {
    handle: 'ana',
    password: 'ana password',
    email: 'ana@example.com'
  }
  const bob = {
    handle: 'bob',
    password: 'bob password',
    email: 'bob@example.com'
  }
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => new Promise((resolve, reject) => {
        signup({
          browser,
          port,
          handle: ana.handle,
          password: ana.password,
          email: ana.email
        }, error => {
          if (error) return reject(error)
          resolve()
        })
      }))
      .then(() => new Promise((resolve, reject) => {
        signup({
          browser,
          port,
          handle: bob.handle,
          password: bob.password,
          email: bob.email
        }, error => {
          if (error) return reject(error)
          resolve()
        })
      }))
      .then(() => signin({
        browser, port, handle: ana.handle, password: ana.password
      }))
      .then(() => verifySignIn({
        browser, port, test, handle: ana.handle, email: ana.email
      }))
      .then(() => signout({ browser, port }))
      .then(() => signin({
        browser, port, handle: bob.handle, password: bob.password
      }))
      .then(() => verifySignIn({
        browser, port, test, handle: bob.handle, email: bob.email
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
