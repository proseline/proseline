const assert = require('assert')
const crypto = require('../crypto')
const csrf = require('../csrf')
const fs = require('fs')
const handle = require('../')
const http = require('http')
const os = require('os')
const path = require('path')
const pino = require('pino')
const pinoHTTP = require('pino-http')
const runSeries = require('run-series')
const s3 = require('../s3')
const simpleConcat = require('simple-concat')
const spawn = require('child_process').spawn

module.exports = callback => {
  assert(typeof callback === 'function')
  const logger = pino({}, fs.createWriteStream('test-server.log'))
  const addLoggers = pinoHTTP({ logger })
  process.env.CSRF_KEY = csrf.randomKey()
  const keyPair = crypto.keyPair()
  process.env.PUBLIC_KEY = keyPair.publicKey
  process.env.SECRET_KEY = keyPair.secretKey
  let webServer
  let stripeListen
  fs.mkdtemp(path.join(os.tmpdir(), 'proseline-'), (error, tmp) => {
    if (error) {
      cleanup()
      throw error
    }
    webServer = http.createServer((request, response) => {
      addLoggers(request, response)
      handle(request, response)
    })
    webServer.listen(0, function () {
      const port = this.address().port
      process.env.BASE_HREF = 'http://localhost:' + port
      process.env.ADMIN_EMAIL = 'admin@example.com'
      const missing = require('../check-environment')()
      if (missing.length !== 0) {
        cleanup()
        missing.forEach(missing => {
          console.error(`Missing environment variable: ${missing}`)
        })
        assert(false)
      }
      runSeries([
        function setWebhookSecret (done) {
          const stripeSecret = spawn('stripe', ['listen', '--print-secret'])
          simpleConcat(stripeSecret.stdout, (_, buffer) => {
            const secret = buffer.toString().trim()
            process.env.STRIPE_WEBHOOK_SECRET = secret
            logger.info({ secret }, 'Stripe webhook secret')
            done()
          })
        },
        function listenForEvents (done) {
          const events = [
            'checkout.session.completed',
            'customer.subscription.deleted'
          ]
          const stripeArguments = [
            'listen',
            '--skip-update',
            '--print-json',
            '--forward-to', `localhost:${port}/stripe-webhook`,
            '--events', events.join(',')
          ]
          stripeListen = spawn('stripe', stripeArguments)
          stripeListen.stdout.pipe(fs.createWriteStream('stripe.out.log'))
          stripeListen.stderr.pipe(fs.createWriteStream('stripe.err.log'))
          stripeListen.stderr.addListener('data', listenForRead)
          let chunks = []
          function listenForRead (chunk) {
            chunks.push(chunk)
            if (Buffer.concat(chunks).toString().includes('Ready!')) {
              chunks = null
              stripeListen.stderr.removeListener('data', listenForRead)
              done()
            }
          }
        }
      ], () => {
        callback(port, cleanup)
      })
    })
  })

  function cleanup () {
    if (webServer) webServer.close()
    if (stripeListen) stripeListen.kill()
    s3.clear()
  }
}
