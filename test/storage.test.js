import * as crypto from '../crypto.js'
import runSeries from 'run-series'
import * as s3 from '../s3.js'
import * as storage from '../storage.js'
import tap from 'tap'

const encryptionKey = crypto.generateEncryptionKey()
const discoveryKey = crypto.generateDiscoveryKey(encryptionKey)
const { publicKey } = crypto.generateKeyPair()

tap.test('entry streaming', test => {
  const entries = [...new Array(100)].map((_, index) => { return { index } })
  const writeTasks = entries.map((entry, index) => done => {
    storage.entry.write(discoveryKey, publicKey, index, entry, done)
  })
  runSeries(writeTasks, (error) => {
    test.ifError(error, 'no error writing entries')
    storage.entry.list(discoveryKey, publicKey, (error, keys) => {
      test.ifError(error, 'no list error')
      test.same(keys.length, 100, '100 keys listed')
      const stream = storage.entry.stream(discoveryKey, publicKey)
      const streamed = []
      stream
        .on('data', entry => streamed.push(entry))
        .once('end', () => {
          test.same(streamed, entries, 'streamed all entries in order')
          s3.clear()
          test.end()
        })
    })
  })
})

tap.test('entry streaming from index', test => {
  const entries = [...new Array(100)].map((_, index) => { return { index } })
  const writeTasks = entries.map((entry, index) => done => {
    storage.entry.write(discoveryKey, publicKey, index, entry, done)
  })
  runSeries(writeTasks, (error) => {
    test.ifError(error, 'no error writing entries')
    const stream = storage.entry.stream(discoveryKey, publicKey, 50)
    const streamed = []
    stream
      .on('data', entry => streamed.push(entry))
      .once('end', () => {
        test.same(streamed, entries.slice(50), 'streamed entries from 50')
        s3.clear()
        test.end()
      })
  })
})
