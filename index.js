const doNotCache = require('do-not-cache')
const fs = require('fs')
const parseURL = require('url-parse')
const path = require('path')

const inProduction = process.env.NODE_ENV === 'production'

module.exports = (request, response) => {
  const parsed = request.parsed = parseURL(request.url, true)
  const pathname = parsed.pathname
  if (pathname === '/') return serveIndex(request, response)
  if (pathname === '/styles.css') return serveStyles(request, response)
  if (pathname === '/client.js') return serveClient(request, response)
  if (pathname === '/internal-error' && !inProduction) {
    const testError = new Error('test error')
    return serve500(request, response, testError)
  }
  serve404(request, response)
}

// Partials

const meta = `
<meta charset=UTF-8>
<meta name=viewport content="width=device-width, initial-scale=1">
<link href=/styles.css rel=stylesheet>
`.trim()

// Routes

function serveIndex (request, response) {
  if (request.method !== 'GET') return serve405(request, response)
  doNotCache(response)
  response.setHeader('Content-Type', 'text/html')
  response.end(`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>Proseline</title>
  </head>
  <body>
    <main>
    </main>
  </body>
</html>
  `.trim())
}

function serveStyles (request, response) {
  const file = path.join(__dirname, 'styles.css')
  response.setHeader('Content-Type', 'text/css')
  fs.createReadStream(file).pipe(response)
}

function serveClient (request, response) {
  const file = path.join(__dirname, 'client.js')
  response.setHeader('Content-Type', 'text/javascript')
  fs.createReadStream(file).pipe(response)
}

function serve404 (request, response) {
  response.statusCode = 404
  response.setHeader('Content-Type', 'text/html')
  response.end(`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>Not Found / Proseline</title>
  </head>
  <body>
    <main>
      <h1>Not Found</h1>
    </main>
  </body>
</html>
  `.trim())
}

function serve500 (request, response, error) {
  request.log.error(error)
  response.statusCode = 500
  response.setHeader('Content-Type', 'text/html')
  response.end(`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>Internal Error / Proseline</title>
  </head>
  <body>
    <main>
      <h1>Internal Error</h1>
    </main>
  </body>
</html>
  `.trim())
}

function serve405 (request, response) {
  response.statusCode = 405
  response.setHeader('Content-Type', 'text/plain')
  response.end('Method Not Allowed')
}
