// Start the server.
//
// Note that `npm start` will run `./start`, rather than
// running this script directly.

// Logging

import pino from 'pino'
import pinoHTTP from 'pino-http'
import checkEnvironment from './check-environment.js'
import requestHandler from './index.js'
import http from 'http'

const logger = pino()
const addLoggers = pinoHTTP({ logger })

// Environment

const missing = checkEnvironment()
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

const server = http.createServer()

server.on('request', (request, response) => {
  try {
    addLoggers(request, response)
    requestHandler(request, response)
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
