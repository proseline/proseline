import assert from 'assert'

export default async ({ browser, port, handle, password }) => {
  assert(browser)
  assert(Number.isSafeInteger(port))
  assert(typeof handle === 'string')
  assert(typeof password === 'string')
  await browser.navigateTo('http://localhost:' + port)
  const login = await browser.$('#login')
  await login.click()
  const handleInput = await browser.$('#loginForm input[name="handle"]')
  await handleInput.addValue(handle)
  const passwordInput = await browser.$('#loginForm input[name="password"]')
  await passwordInput.addValue(password)
  const submitButton = await browser.$('#loginForm button[type="submit"]')
  await submitButton.click()
}
