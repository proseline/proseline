/* eslint-env browser */
/* global Stripe, STRIPE_PUBLISHABLE_KEY */
/* global clientSecret, paymentMethodID */

document.addEventListener('DOMContentLoaded', () => {
  const stripe = Stripe(STRIPE_PUBLISHABLE_KEY)
  stripe
    .confirmCardPayment(clientSecret, {
      payment_method: paymentMethodID
    })
    .then(result => {
      const main = document.getElementById('main')
      const p = document.createElement('p')
      if (result.error) {
        p.className = 'message error'
        p.appendChild(document.createTextNode(result.error.message))
        main.appendChild(p)
        return
      }
      p.className = 'message success'
      p.appendChild(document.createTextNode('Successfully subscribed!'))
      main.appendChild(p)
    })
})
