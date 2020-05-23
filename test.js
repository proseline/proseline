const fs = require('fs')
const handle = require('./')
const http = require('http')
const pino = require('pino')
const pinoHTTP = require('pino-http')
const simpleConcat = require('simple-concat')
const tape = require('tape')

simple({
  path: '/',
  content: '<!doctype html>'
})

simple({
  path: '/styles.css',
  mime: 'text/css',
  content: 'font-family'
})

simple({
  path: '/client.js',
  mime: 'text/javascript',
  content: 'document.addEventListener'
})

simple({
  path: '/nonexistent',
  status: 404,
  content: '<!doctype html>'
})

simple({
  path: '/internal-error',
  status: 500,
  content: '<!doctype html>'
})

simple({
  method: 'POST',
  path: '/',
  status: 405,
  mime: 'text/plain',
  content: 'Method Not Allowed'
})

function simple ({
  method = 'GET',
  path,
  status = 200,
  mime = 'text/html',
  content
}) {
  tape(`${method} ${path}`, (test) => {
    server((port, close) => {
      http.request({ method, port, path })
        .once('response', (response) => {
          test.equal(response.statusCode, status, String(status))
          test.equal(response.headers['content-type'], mime, mime)
          simpleConcat(response, (error, body) => {
            test.ifError(error, 'no error')
            test.assert(
              body.toString().includes(content),
              content
            )
            test.end()
            close()
          })
        })
        .end()
    })
  })
}

function server (callback) {
  const logger = pino({}, fs.createWriteStream('test-server.log'))
  const server = http.createServer()
  const addLoggers = pinoHTTP({ logger })
  server.on('request', (request, response) => {
    addLoggers(request, response)
    handle(request, response)
  })
  server.listen(0, function () {
    const port = this.address().port
    callback(port, cleanup)
  })
  function cleanup () {
    server.close()
  }
}
