import assert from 'assert'
import events from '../test-events.js'
import timeout from './timeout.js'

export default async ({ page, port, handle, password, email }) => {
  assert(page)
  assert(Number.isSafeInteger(port))
  assert(typeof handle === 'string')
  assert(typeof password === 'string')
  assert(typeof email === 'string')
  await page.goto('http://localhost:' + port)
  await page.click('text="Sign Up"')
  const signupForm = '#signupForm'
  await page.fill(`${signupForm} input[name="email"]`, email)
  await page.fill(`${signupForm} input[name="handle"]`, handle)
  await page.fill(`${signupForm} input[name="password"]`, password)
  await page.fill(`${signupForm} input[name="repeat"]`, password)
  let confirmURL
  await Promise.all([
    new Promise((resolve, reject) => {
      events.once('sent', ({ subject, text }) => {
        confirmURL = /<(http:\/\/[^ ]+)>/.exec(text)[1]
        resolve()
      })
    }),
    page.click(`${signupForm} button[type="submit"]`)
  ])
  await page.goto(confirmURL)
  await timeout(1000)
}
