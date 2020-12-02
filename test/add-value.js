export default async (browser, selector, value) => {
  const element = await browser.$(selector)
  await element.addValue(value)
}
