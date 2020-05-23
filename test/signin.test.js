const ANA = require('./ana')
const BOB = require('./bob')
const http = require('http')
const server = require('./server')
const tape = require('tape')
const webdriver = require('./webdriver')

const path = '/signin'

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

tape('browse ' + path, test => {
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#signin'))
      .then(a => a.click())
      .then(() => browser.$('h2'))
      .then(title => title.getText())
      .then(text => {
        test.equal(text, 'Log In', '<h2>Log In</h2>')
        test.end()
        done()
      })
      .catch(error => {
        test.fail(error)
        test.end()
        done()
      })
  })
})

tape('log in as Ana', test => {
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#signin'))
      .then(a => a.click())
      .then(() => browser.$('#signinForm input[name="handle"]'))
      .then(input => input.addValue(ANA.handle))
      .then(() => browser.$('#signinForm input[name="password"]'))
      .then(input => input.addValue(ANA.password))
      .then(() => browser.$('#signinForm button[type="submit"]'))
      .then(submit => submit.click())
      .then(() => browser.$('p.welcome'))
      .then(p => p.getText())
      .then(text => {
        test.assert(text.includes(ANA.handle), 'welcome')
        finish()
      })
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

tape('log in as Bob', test => {
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#signin'))
      .then(a => a.click())
      .then(() => browser.$('#signinForm input[name="handle"]'))
      .then(input => input.addValue(BOB.handle))
      .then(() => browser.$('#signinForm input[name="password"]'))
      .then(input => input.addValue(BOB.password))
      .then(() => browser.$('#signinForm button[type="submit"]'))
      .then(submit => submit.click())
      .then(() => browser.$('p.welcome'))
      .then(p => p.getText())
      .then(text => {
        test.assert(text.includes(BOB.handle), 'welcome')
        finish()
      })
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

tape('log in with bad credentials', test => {
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#signin'))
      .then(a => a.click())
      .then(() => browser.$('#signinForm input[name="handle"]'))
      .then(input => input.addValue('invalid'))
      .then(() => browser.$('#signinForm input[name="password"]'))
      .then(input => input.addValue('invalid'))
      .then(() => browser.$('#signinForm button[type="submit"]'))
      .then(submit => submit.click())
      .then(() => browser.$('p.error'))
      .then(p => p.getText())
      .then(text => {
        test.assert(text.includes('invalid'), 'invalid')
        finish()
      })
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

tape('log in with bad password', test => {
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('#signin'))
      .then(a => a.click())
      .then(() => browser.$('#signinForm input[name="handle"]'))
      .then(input => input.addValue(ANA.handle))
      .then(() => browser.$('#signinForm input[name="password"]'))
      .then(input => input.addValue('invalid'))
      .then(() => browser.$('#signinForm button[type="submit"]'))
      .then(submit => submit.click())
      .then(() => browser.$('p.error'))
      .then(p => p.getText())
      .then(text => {
        test.assert(text.includes('invalid'), 'invalid')
        finish()
      })
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

tape('lockout', test => {
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => signInWithPassword('invalid', 'invalid handle or password'))
      .then(() => signInWithPassword('invalid', 'invalid handle or password'))
      .then(() => signInWithPassword('invalid', 'invalid handle or password'))
      .then(() => signInWithPassword('invalid', 'invalid handle or password'))
      .then(() => signInWithPassword('invalid', 'invalid handle or password'))
      .then(() => signInWithPassword(ANA.password, 'account locked'))
      .then(finish)
      .catch(error => {
        test.fail(error)
        finish()
      })

    function signInWithPassword (password, message) {
      return browser.navigateTo('http://localhost:' + port)
        .then(() => browser.$('#signin'))
        .then(a => a.click())
        .then(() => browser.$('#signinForm input[name="handle"]'))
        .then(input => input.addValue(ANA.handle))
        .then(() => browser.$('#signinForm input[name="password"]'))
        .then(input => input.addValue(password))
        .then(() => browser.$('#signinForm button[type="submit"]'))
        .then(submit => submit.click())
        .then(() => browser.$('p.error'))
        .then(p => p.getText())
        .then(text => { test.equal(text, message, message) })
    }

    function finish () {
      test.end()
      done()
    }
  })
})
