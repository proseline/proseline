const assert = require('assert')

module.exports = ({ browser, port, handle, password }, callback) => {
  assert(browser)
  assert(Number.isSafeInteger(port))
  assert(typeof handle === 'string')
  assert(typeof password === 'string')
  return browser.navigateTo('http://localhost:' + port)
    .then(() => browser.$('#login'))
    .then(a => a.click())
    .then(() => browser.$('#loginForm input[name="handle"]'))
    .then(input => input.addValue(handle))
    .then(() => browser.$('#loginForm input[name="password"]'))
    .then(input => input.addValue(password))
    .then(() => browser.$('#loginForm button[type="submit"]'))
    .then(submit => submit.click())
    .catch(callback)
}
