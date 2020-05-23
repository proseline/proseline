const csrf = require('../util/csrf')
const fs = require('fs')
const rimraf = require('rimraf')
const runSeries = require('run-series')
const spawn = require('child_process').spawn
const spawnNats = require('./spawn-nats')
const tape = require('tape')

tape('server', test => {
  fs.mkdtemp('/tmp/', (_, directory) => {
    let nats, server, curl
    const NATSS_CLUSTER = 'commonform-test'
    const NATSS_STREAM = 'commonform'
    const serverPort = 8080
    runSeries([
      done => {
        spawnNats({ cluster: NATSS_CLUSTER }, (error, spawned) => {
          if (error) return done(error)
          nats = spawned
          done()
        })
      },
      done => {
        server = spawn('node', ['server.js'], {
          env: {
            PORT: serverPort,
            NODE_ENV: 'test',
            BASE_HREF: 'http://localhost:' + serverPort + '/',
            NATSS_CLUSTER,
            NATSS_STREAM,
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
            output.includes('<h1>Common Form</h1>'),
            'output includes <h1>Common Form</h1>'
          )
          server.kill(9)
          nats.kill(9)
          curl.kill(9)
          rimraf.sync(directory)
          test.end()
        })
    })
  })
})
