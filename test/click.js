export default async (browser, selector) => {
  const element = await browser.$(selector)
  await element.click()
}