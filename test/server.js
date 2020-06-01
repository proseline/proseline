const assert = require('assert')
const csrf = require('../csrf')
const fs = require('fs')
const handle = require('../')
const http = require('http')
const os = require('os')
const path = require('path')
const pino = require('pino')
const pinoHTTP = require('pino-http')
const rimraf = require('rimraf')
const spawn = require('child_process').spawn

module.exports = callback => {
  assert(typeof callback === 'function')
  const logger = pino({}, fs.createWriteStream('test-server.log'))
  const addLoggers = pinoHTTP({ logger })
  process.env.CSRF_KEY = csrf.randomKey()
  let directory
  let webServer
  let stripeCLI
  fs.mkdtemp(path.join(os.tmpdir(), 'proseline-'), (error, tmp) => {
    if (error) {
      cleanup()
      throw error
    }
    directory = tmp
    process.env.DIRECTORY = path.join(tmp, 'indexes')
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
      const events = [
        'checkout.session.completed',
        'customer.subscription.deleted'
      ]
      stripeCLI = spawn(
        'stripe',
        [
          'listen',
          '--forward-to',
          `localhost:${port}/stripe-webhook`,
          '--events',
          events.join(',')
        ]
      )
      stripeCLI.stdout.once('data', () => {
        callback(port, cleanup)
      })
    })
  })

  function cleanup () {
    if (webServer) webServer.close()
    if (directory) rimraf(directory, () => {})
    if (stripeCLI) stripeCLI.kill()
  }
}
