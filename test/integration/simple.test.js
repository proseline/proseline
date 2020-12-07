import fs from 'fs'
import handle from '../../index.js'
import http from 'http'
import pino from 'pino'
import pinoHTTP from 'pino-http'
import simpleConcat from 'simple-concat'
import tap from 'tap'

simple({
  path: '/',
  status: 200,
  mime: 'text/html',
  content: '<!doctype html>'
})

simple({
  path: '/styles.css',
  status: 200,
  mime: 'text/css; charset=UTF-8',
  content: 'font-family'
})

simple({
  path: '/logo.svg',
  status: 200,
  mime: 'image/svg+xml'
})

simple({
  path: '/logo-500.png',
  status: 200,
  mime: 'image/png'
})

simple({
  path: '/logo-1000.png',
  status: 200,
  mime: 'image/png'
})

simple({
  path: '/editor.min.js',
  status: 200,
  mime: 'application/javascript; charset=UTF-8'
})

simple({
  path: '/editor.min.js.map',
  status: 200,
  mime: 'application/json; charset=UTF-8'
})

simple({
  path: '/nonexistent',
  status: 404,
  mime: 'text/html',
  content: '<!doctype html>'
})

simple({
  path: '/internal-error',
  status: 500,
  mime: 'text/html',
  content: '<!doctype html>'
})

simple({
  method: 'POST',
  path: '/',
  status: 405,
  mime: 'text/plain',
  content: 'Method Not Allowed'
})

simple({
  method: 'GET',
  path: '/robots.txt',
  status: 200,
  mime: 'text/plain; charset=UTF-8',
  content: 'Disallow: /'
})

simple({
  method: 'GET',
  path: '/credits.txt',
  status: 200,
  mime: 'text/plain; charset=UTF-8',
  content: 'Kyle E. Mitchell'
})

simple({
  method: 'GET',
  path: '/public-key',
  status: 200,
  mime: 'application/octet-stream'
})

function simple ({
  auth,
  method = 'GET',
  path,
  status,
  mime,
  content
}) {
  tap.test(`${method} ${path}`, test => {
    server((port, close) => {
      http.request({ auth, method, port, path })
        .once('response', response => {
          if (status) {
            test.equal(response.statusCode, status, String(status))
          }
          if (mime) {
            test.equal(response.headers['content-type'], mime, mime)
          }
          if (content) {
            return simpleConcat(response, (error, body) => {
              test.ifError(error, 'no error')
              test.assert(
                body.toString().includes(content),
                content
              )
              close()
              test.end()
            })
          }
          close()
          test.end()
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
  server.listen(0, () => {
    const port = server.address().port
    callback(port, cleanup)
  })
  function cleanup () {
    server.close()
  }
}
