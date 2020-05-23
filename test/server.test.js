const csrf = require('../csrf')
const fs = require('fs')
const rimraf = require('rimraf')
const runSeries = require('run-series')
const spawn = require('child_process').spawn
const tape = require('tape')

tape('server', test => {
  fs.mkdtemp('/tmp/', (_, directory) => {
    let server, curl
    const serverPort = 8080
    runSeries([
      done => {
        server = spawn('node', ['server.js'], {
          env: {
            PORT: serverPort,
            NODE_ENV: 'test',
            BASE_HREF: 'http://localhost:' + serverPort + '/',
            CSRF_KEY: csrf.randomKey(),
            DIRECTORY: directory
          }
        })
        server.stdout.once('data', () => {
          test.pass('spawned server')
          done()
        })
      }
    ], error => {
      test.ifError(error, 'no error')
      curl = spawn('curl', ['http://localhost:' + serverPort])
      const chunks = []
      curl.stdout
        .on('data', chunk => { chunks.push(chunk) })
        .once('end', () => {
          const output = Buffer.concat(chunks).toString()
          test.assert(
            output.includes('<h1>Proseline</h1>'),
            'output includes <h1>Proseline</h1>'
          )
          server.kill(9)
          curl.kill(9)
          rimraf.sync(directory)
          test.end()
        })
    })
  })
})
