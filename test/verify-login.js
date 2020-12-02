import assert from 'assert'

export default async ({ browser, test, port, handle, email }) => {
  assert(browser)
  assert(test)
  assert(Number.isSafeInteger(port))
  assert(typeof handle === 'string')
  assert(typeof email === 'string')
  await browser.navigateTo('http://localhost:' + port)
  const handleElement = await browser.$('.handle')
  const handleText = await handleElement.getText()
  test.equal(handleText, handle, '/account shows handle')
  const eMailElement = await browser.$('.email')
  const eMailText = await eMailElement.getText()
  test.equal(eMailText, email, '/account shows e-mail')
}
