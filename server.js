// Start the server.
//
// Note that `npm start` will run `./start`, rather than
// running this script directly.

// Logging

const logger = require('pino')()
const addLoggers = require('pino-http')({ logger })

// Environment

const missing = require('./check-environment')()
if (missing.length !== 0) {
  missing.forEach(missing => {
    logger.error({ variable: missing }, 'missing environment variable')
  })
  process.exit(1)
}

// Error Handling

process
  .on('SIGTERM', shutdown)
  .on('SIGQUIT', shutdown)
  .on('SIGINT', shutdown)
  .on('uncaughtException', error => {
    logger.error(error, 'uncaughtException')
    shutdown()
  })

// HTTP Server

const server = require('http').createServer()
const handle = require('./')

server.on('request', (request, response) => {
  try {
    addLoggers(request, response)
    handle(request, response)
  } catch (error) {
    request.log.error(error)
  }
})

server.listen(process.env.PORT || 8080, () => {
  logger.info({ port: server.address().port }, 'listening')
})

function shutdown () {
  server.close(() => process.exit())
}
