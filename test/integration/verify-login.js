import assert from 'assert'

export default async ({ page, test, port, handle, email }) => {
  assert(page)
  assert(test)
  assert(Number.isSafeInteger(port))
  assert(typeof handle === 'string')
  assert(typeof email === 'string')
  await page.goto('http://localhost:' + port)
  const handleText = await page.textContent('.handle')
  test.equal(handleText, handle, '/account shows handle')
  const eMailText = await page.textContent('.email')
  test.equal(eMailText, email, '/account shows e-mail')
}
