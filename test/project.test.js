const login = require('./login')
const server = require('./server')
const signup = require('./signup')
const tape = require('tape')
const subscribe = require('./subscribe')
const verifyLogIn = require('./verify-login')
const webdriver = require('./webdriver')

tape('create project', test => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  server(async (port, done) => {
    const browser = await webdriver()

    await new Promise((resolve, reject) => {
      signup({
        browser, port, handle, password, email
      }, error => {
        if (error) return reject(error)
        resolve()
      })
    })
    await login({ browser, port, handle, password })
    await verifyLogIn({ browser, port, test, handle, email })
    await subscribe({ browser, port, test })

    // Create Project
    await browser.navigateTo('http://localhost:' + port)
    const project = await browser.$('#project')
    await project.waitForExist({ timeout: 20000 })
    await project.click()

    const projectTitle = 'Test Project'
    const title = await browser.$('#projectForm input[name=title]')
    await title.waitForExist({ timeout: 20000 })
    await title.setValue(projectTitle)

    const submitProject = await browser.$('#projectForm button[type=submit]')
    await submitProject.click()

    const h2 = await browser.$('h2=Test Project')
    await h2.waitForExist()
    test.pass('project page')

    // Navigate back to homepage.
    await browser.navigateTo('http://localhost:' + port)
    const projectLink = await browser.$(`a=${projectTitle}`)
    await projectLink.waitForExist()
    test.pass('project link on homepage')

    test.end()
    done()
  })
})
