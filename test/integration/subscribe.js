import events from '../../test-events.js'

export default async ({
  page,
  port,
  test,
  name = 'Joe Customer',
  zip = '12345'
}) => {
  // Navigate to checkout page.
  await page.goto('http://localhost:' + port)
  await page.click('#subscribe')

  // Enter payment details.
  await page.fill('#cardNumber', '4242424242424242')
  await page.fill('#cardExpiry', '10 / 31')
  await page.fill('#cardCvc', '123')

  // Enter customer details.
  await page.fill('#billingName', name)
  await page.fill('#billingPostalCode', zip)

  // Submit the order.
  await page.click('button[type=submit]')

  await Promise.all([
    // Wait for web app to process webhook.
    new Promise((resolve, reject) => {
      events.once('checkout.session.completed', () => resolve())
    }),
    (async () => {
      // Confirm
      const message = await page.textContent('.message')
      test.assert(message.includes('Thank you'), 'subscribed')
    })()
  ])
}
