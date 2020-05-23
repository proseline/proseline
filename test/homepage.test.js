const server = require('./server')
const tape = require('tape')
const webdriver = require('./webdriver')

tape('browse /', test => {
  server((port, done) => {
    let browser
    webdriver()
      .then(loaded => { browser = loaded })
      .then(() => browser.navigateTo('http://localhost:' + port))
      .then(() => browser.$('h1'))
      .then(title => title.getText())
      .then(text => {
        test.equal(text, 'Proseline')
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
