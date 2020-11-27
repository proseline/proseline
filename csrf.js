// Generate and verify tokens used to prevent cross-site
// request forgery.

const assert = require('assert')
const expired = require('./expired')
const html = require('./html')
const sodium = require('sodium-native')

// Generate CSRF tokens.
exports.generate = ({
  action,
  sessionID,
  date = new Date().toISOString()
}) => {
  assert(typeof action === 'string')
  assert(typeof sessionID === 'string')
  assert(typeof date === 'string')

  const key = Buffer.from(process.env.CSRF_KEY, 'hex')
  const plaintext = `${action}\n${sessionID}\n${date}`
  const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
  sodium.randombytes_buf(nonce)
  const input = Buffer.from(plaintext)
  const ciphertext = Buffer.alloc(input.length + sodium.crypto_secretbox_MACBYTES)
  sodium.crypto_secretbox_easy(ciphertext, input, nonce, key)
  return {
    token: ciphertext.toString('hex'),
    nonce: nonce.toString('hex')
  }
}

const tokenName = exports.tokenName = 'csrftoken'
const nonceName = exports.nonceName = 'csrfnonce'

exports.names = [tokenName, nonceName]

// Generate hidden HTML form inputs.
exports.inputs = ({ action, sessionID }) => {
  assert(typeof action === 'string')
  assert(typeof sessionID === 'string')

  const generated = exports.generate({ action, sessionID })
  return html`
    <input type=hidden name="${tokenName}" value="${generated.token}">
    <input type=hidden name="${nonceName}" value="${generated.nonce}">
  `
}

// Verify a CSRF token submitted with a form.
exports.verify = ({ action, sessionID, token, nonce }, callback) => {
  assert(typeof action === 'string')
  assert(typeof sessionID === 'string')
  assert(typeof token === 'string')
  assert(typeof nonce === 'string')

  const ciphertext = Buffer.from(token, 'hex')
  const key = Buffer.from(process.env.CSRF_KEY, 'hex')
  const plaintext = Buffer.alloc(ciphertext.length - sodium.crypto_secretbox_MACBYTES)
  const nonceBuffer = Buffer.from(nonce, 'hex')
  if (!sodium.crypto_secretbox_open_easy(plaintext, ciphertext, nonceBuffer, key)) {
    const error = new Error('decryption failure')
    error.decryption = true
    return callback(error)
  }
  const [encryptedAction, encryptedSessionID, date] = plaintext.toString().split('\n')
  if (encryptedAction !== action) {
    const error = new Error('action mismatch')
    error.field = 'action'
    error.expected = action
    error.received = encryptedAction
    return callback(error)
  }
  if (encryptedSessionID !== sessionID) {
    const error = new Error('session mismatch')
    error.field = 'sessionID'
    error.expected = sessionID
    error.received = encryptedSessionID
    return callback(error)
  }
  if (expired.csrfToken(date)) {
    const error = new Error('expired')
    error.field = 'date'
    error.date = date
    return callback(error)
  }
  callback()
}

// Return a random key for generating CSRF tokens. The
// web application loads such a key from the CSRF_KEY
// environment variable.
exports.randomKey = () => {
  const key = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES)
  sodium.randombytes_buf(key)
  return key.toString('hex')
}
