import { randomKey, verify, generate } from '../csrf.js'
import tap from 'tap'
import { v4 as uuid } from 'uuid'

tap.test('CSRF round trip', test => {
  process.env.CSRF_KEY = randomKey()
  const action = '/logout'
  const sessionID = uuid()
  const { token, nonce } = generate({ action, sessionID })
  verify({ action, sessionID, token, nonce }, error => {
    test.ifError(error)
    test.end()
  })
})

tap.test('CSRF action mismatch', test => {
  process.env.CSRF_KEY = randomKey()
  const action = '/logout'
  const sessionID = uuid()
  const { token, nonce } = generate({ action, sessionID })
  verify({ action: '/login', sessionID, token, nonce }, error => {
    test.assert(error, 'error')
    test.equal(error.field, 'action', 'action')
    test.end()
  })
})

tap.test('CSRF session mismatch', test => {
  process.env.CSRF_KEY = randomKey()
  const action = '/logout'
  const sessionID = uuid()
  const { token, nonce } = generate({ action, sessionID })
  verify({ action, sessionID: uuid(), token, nonce }, error => {
    test.assert(error, 'error')
    test.equal(error.field, 'sessionID', 'sessionID')
    test.end()
  })
})
