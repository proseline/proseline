import { generateKeyPair } from '../crypto.js'
import simpleConcat from 'simple-concat'
import http from 'http'
import { randomKey } from '../csrf.js'
import fs from 'fs'
import runSeries from 'run-series'
import { spawn } from 'child_process'
import tap from 'tap'

tap.test('server', test => {
  fs.mkdtemp('/tmp/', _ => {
    let server
    const serverPort = 8080
    const keyPair = generateKeyPair()
    runSeries([
      done => {
        server = spawn('node', ['server.js'], {
          env: {
            PORT: serverPort,
            NODE_ENV: 'test',
            BASE_HREF: 'http://localhost:' + serverPort + '/',
            CSRF_KEY: randomKey(),
            PUBLIC_KEY: keyPair.publicKey,
            SECRET_KEY: keyPair.secretKey,
            STRIPE_PLAN: process.env.STRIPE_PLAN,
            STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
            STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
          }
        })
        server.stdout.once('data', () => {
          test.pass('spawned server')
          done()
        })
      }
    ], error => {
      test.ifError(error, 'no error')
      http.get('http://localhost:' + serverPort, (response) => {
        simpleConcat(response, (error, buffer) => {
          test.ifError(error, 'no concat error')
          test.assert(
            buffer.toString().includes('<h1>Proseline</h1>'),
            'output includes <h1>Proseline</h1>'
          )
          server.kill(9)
          test.end()
        })
      })
    })
  })
})
