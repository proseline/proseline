// Generate and verify tokens used to prevent cross-site
// request forgery.

import assert from 'assert'
import { csrfToken as csrfTokenExpired } from './expired.js'
import html from './html.js'
import sodium from 'sodium-native'

// Generate CSRF tokens.
export const generate = ({
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

export const tokenName = 'csrftoken'
export const nonceName = 'csrfnonce'

export const names = [tokenName, nonceName]

// Generate hidden HTML form inputs.
export const inputs = ({ action, sessionID }) => {
  assert(typeof action === 'string')
  assert(typeof sessionID === 'string')

  const generated = generate({ action, sessionID })
  return html`
    <input type=hidden name="${tokenName}" value="${generated.token}">
    <input type=hidden name="${nonceName}" value="${generated.nonce}">
  `
}

// Verify a CSRF token submitted with a form.
export const verify = ({ action, sessionID, token, nonce }, callback) => {
  assert(typeof action === 'string')
  assert(typeof sessionID === 'string')
  assert(typeof token === 'string')
  assert(typeof nonce === 'string')

  const ciphertext = Buffer.from(token, 'hex')
  const key = Buffer.from(process.env.CSRF_KEY, 'hex')
  const plaintext = Buffer.alloc(ciphertext.length - sodium.crypto_secretbox_MACBYTES)
  const nonceBuffer = Buffer.from(nonce, 'hex')
  if (!sodium.crypto_secretbox_open_easy(plaintext, ciphertext, nonceBuffer, key)) {
    const decryptionError = new Error('decryption failure')
    decryptionError.decryption = true
    return callback(decryptionError)
  }
  const [encryptedAction, encryptedSessionID, date] = plaintext.toString().split('\n')
  if (encryptedAction !== action) {
    const actionError = new Error('action mismatch')
    actionError.field = 'action'
    actionError.expected = action
    actionError.received = encryptedAction
    return callback(actionError)
  }
  if (encryptedSessionID !== sessionID) {
    const mismatchError = new Error('session mismatch')
    mismatchError.field = 'sessionID'
    mismatchError.expected = sessionID
    mismatchError.received = encryptedSessionID
    return callback(mismatchError)
  }
  if (csrfTokenExpired(date)) {
    const expiredError = new Error('expired')
    expiredError.field = 'date'
    expiredError.date = date
    return callback(expiredError)
  }
  callback()
}

// Return a random key for generating CSRF tokens. The
// web application loads such a key from the CSRF_KEY
// environment variable.
export const randomKey = () => {
  const key = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES)
  sodium.randombytes_buf(key)
  return key.toString('hex')
}
