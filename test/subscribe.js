import events from '../test-events.js'
import timeout from './timeout.js'

export default async ({
  browser,
  port,
  test,
  name = 'Joe Customer',
  zip = '12345'
}) => {
  // Navigate to checkout page.
  await browser.navigateTo('http://localhost:' + port)
  const subscribe = await browser.$('#subscribe')
  await subscribe.click()

  // Enter payment details.
  const cardNumber = await browser.$('#cardNumber')
  await cardNumber.addValue('42')
  await timeout(200)
  await cardNumber.addValue('42')
  await timeout(200)
  await cardNumber.addValue('42')
  await timeout(200)
  await cardNumber.addValue('42')
  await timeout(200)
  await cardNumber.addValue('42')
  await timeout(200)
  await cardNumber.addValue('42')
  await timeout(200)
  await cardNumber.addValue('42')
  await timeout(200)
  await cardNumber.addValue('42')

  const expiry = await browser.$('#cardExpiry')
  await expiry.setValue('10 / 31')

  const cvc = await browser.$('#cardCvc')
  await cvc.setValue('123')

  // Enter customer details.
  const nameInput = await browser.$('#billingName')
  await nameInput.setValue(name)

  const zipInput = await browser.$('#billingPostalCode')
  await zipInput.setValue(zip)

  // Submit the order.
  const submit = await browser.$('button[type=submit]')
  await submit.click()

  await Promise.all([
    // Wait for web app to process webhook.
    new Promise((resolve, reject) => {
      events.once('checkout.session.completed', () => resolve())
    }),
    (async () => {
      // Confirm
      const message = await browser.$('.message')
      await message.waitForExist({ timeout: 20000 })
      const messageText = await message.getText()
      test.assert(messageText.includes('Thank you'), 'subscribed')
    })()
  ])
}
