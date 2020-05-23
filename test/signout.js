module.exports = ({ browser, port }, callback) => {
  return browser.navigateTo('http://localhost:' + port + '/')
    .then(() => browser.$('#signout'))
    .then(element => element.click())
    .catch(callback)
}
