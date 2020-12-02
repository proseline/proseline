export default async ({ browser, port }) => {
  await browser.navigateTo('http://localhost:' + port + '/')
  const logout = await browser.$('#logout')
  await logout.click()
}
