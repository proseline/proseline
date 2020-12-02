import login from './login.js'
import signup from './signup.js'
import subscribe from './subscribe.js'
import verifyLogIn from './verify-login.js'
import interactive from './interactive.js'

interactive('create project', async ({ browser, port, test }) => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  await signup({ browser, port, handle, password, email })
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
})
