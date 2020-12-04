import login from './login.js'
import signup from './signup.js'
import subscribe from './subscribe.js'
import verifyLogIn from './verify-login.js'
import interactive from './interactive.js'

interactive('create project', async ({ page, port, test }) => {
  const handle = 'ana'
  const password = 'test password'
  const email = 'ana@example.com'
  await signup({ page, port, handle, password, email })
  await login({ page, port, handle, password })
  await verifyLogIn({ page, port, test, handle, email })
  await subscribe({ page, port, test })

  // Create Project
  await page.goto('http://localhost:' + port)
  await page.click('#project')

  const projectTitle = 'Test Project'
  await page.fill('#projectForm input[name=title]', projectTitle)
  await page.click('#projectForm button[type=submit]')

  await page.waitForSelector(`text="${projectTitle}"`)
  test.pass('project page')

  // Navigate back to homepage.
  await page.goto('http://localhost:' + port)
  await page.waitForSelector(`text="${projectTitle}"`)
  test.pass('project link on homepage')
})
