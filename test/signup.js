import addValue from './add-value.js'
import assert from 'assert'
import click from './click.js'
import events from '../test-events.js'
import timeout from './timeout.js'

export default async ({ browser, port, handle, password, email }) => {
  assert(browser)
  assert(Number.isSafeInteger(port))
  assert(typeof handle === 'string')
  assert(typeof password === 'string')
  assert(typeof email === 'string')
  await browser.navigateTo('http://localhost:' + port)
  await click(browser, 'a=Sign Up')
  const signupForm = '#signupForm'
  await addValue(browser, `${signupForm} input[name="email"]`, email)
  await addValue(browser, `${signupForm} input[name="handle"]`, handle)
  await addValue(browser, `${signupForm} input[name="password"]`, password)
  await addValue(browser, `${signupForm} input[name="repeat"]`, password)
  let confirmURL
  await Promise.all([
    new Promise((resolve, reject) => {
      events.once('sent', ({ subject, text }) => {
        confirmURL = /<(http:\/\/[^ ]+)>/.exec(text)[1]
        resolve()
      })
    }),
    (async () => {
      const submitButton = await browser.$(`${signupForm} button[type="submit"]`)
      await submitButton.click()
    })()
  ])
  await browser.navigateTo(confirmURL)
  await timeout(1000)
}
