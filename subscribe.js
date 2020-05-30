/* eslint-env browser */
/* global Stripe, STRIPE_PUBLISHABLE_KEY */

document.addEventListener('DOMContentLoaded', () => {
  const stripe = Stripe(STRIPE_PUBLISHABLE_KEY)
  const elements = stripe.elements()
  const card = elements.create('card')
  card.mount(document.getElementById('card'))

  const form = document.getElementById('subscribeForm')
  form.addEventListener('submit', event => {
    event.preventDefault()
    const submit = form.querySelector('[type="submit"]')
    submit.disabled = true
    submit.value = 'Subscribing...'
    stripe
      .createPaymentMethod({ type: 'card', card })
      .then((result) => {
        if (result.error) {
          const errors = document.getElementById('errors')
          errors.textContent = result.error.message
          submit.value = 'Subscribe'
          submit.disabled = false
          return
        }
        const id = result.paymentMethod.id
        form.paymentMethodID.value = id
        form.submit()
      })
      .catch(error => window.alert(error))
  })
})
