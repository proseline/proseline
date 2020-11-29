const assert = require('assert')

module.exports = ({ browser, test, port, handle, email }) => {
  assert(browser)
  assert(test)
  assert(Number.isSafeInteger(port))
  assert(typeof handle === 'string')
  assert(typeof email === 'string')
  return browser.navigateTo('http://localhost:' + port)
    .then(() => browser.$('.handle'))
    .then(element => element.getText())
    .then(text => test.equal(text, handle, '/account shows handle'))
    .then(() => browser.$('.email'))
    .then(element => element.getText())
    .then(text => test.equal(text, email, '/account shows e-mail'))
}
