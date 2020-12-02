// This module exports cryptographic functions and constants.

import assert from 'assert'
import has from 'has'
import sodium from 'sodium-universal'
import stringify from './stringify.js'

// Encodings

const binaryEncoding = 'hex'
const ciphertextEncoding = 'base64'

// Random Data

export function randomHex (bytes) {
  assert(Number.isInteger(bytes))
  assert(bytes > 0)
  const buffer = Buffer.alloc(bytes)
  sodium.randombytes_buf(buffer)
  return buffer.toString(binaryEncoding)
}

export function randomCiphertext (bytes) {
  assert(Number.isInteger(bytes))
  assert(bytes > 0)
  const buffer = Buffer.alloc(bytes)
  sodium.randombytes_buf(buffer)
  return buffer.toString(ciphertextEncoding)
}

// Hashing

export const digestBytes = sodium.crypto_generichash_BYTES

export function hash (input) {
  assert(typeof input === 'string')
  const digestBuffer = Buffer.alloc(digestBytes)
  sodium.crypto_generichash(digestBuffer, Buffer.from(input))
  return digestBuffer.toString(binaryEncoding)
}

export function hashJSON (input) {
  assert(input !== undefined)
  const digestBuffer = Buffer.alloc(digestBytes)
  const inputBuffer = Buffer.from(stringify(input), 'utf8')
  sodium.crypto_generichash(digestBuffer, inputBuffer)
  return digestBuffer.toString(binaryEncoding)
}

// Stream Encryption

export const distributionKeyBytes = sodium.crypto_stream_KEYBYTES
export const generateDistributionKey = () => randomHex(distributionKeyBytes)

export const generateDiscoveryKey = distributionKey => {
  assert(typeof distributionKey === 'string')
  return hash(distributionKey)
}
export const discoveryKeyLength = digestBytes

// Box Encryption

export const keyBytes = sodium.crypto_secretbox_KEYBYTES
export const generateEncryptionKey = () => randomHex(keyBytes)

export const nonceBytes = sodium.crypto_secretbox_NONCEBYTES
export const generateNonce = () => randomHex(nonceBytes)

export const macBytes = sodium.crypto_secretbox_MACBYTES

export const encryptJSON = ({ plaintext, nonce, key }) => {
  return encrypt({ plaintext, encoding: 'json', nonce, key })
}

export const decryptJSON = ({ ciphertext, nonce, key }) => {
  return decrypt({ ciphertext, encoding: 'json', nonce, key })
}

export const encryptString = ({ plaintext, nonce, key }) => {
  return encrypt({ plaintext, encoding: 'utf8', nonce, key })
}

export const decryptString = ({ ciphertext, nonce, key }) => {
  return decrypt({ ciphertext, encoding: 'utf8', nonce, key })
}

export const encryptBinary = ({ plaintext, nonce, key }) => {
  return encrypt({ plaintext, encoding: ciphertextEncoding, nonce, key })
}

export const decryptBinary = ({ ciphertext, nonce, key }) => {
  return decrypt({ ciphertext, encoding: ciphertextEncoding, nonce, key })
}

function encrypt ({ plaintext, encoding, nonce, key }) {
  const plaintextBuffer = decode(plaintext, encoding)
  const ciphertextBuffer = Buffer.alloc(
    plaintextBuffer.length + macBytes
  )
  sodium.crypto_secretbox_easy(
    ciphertextBuffer,
    plaintextBuffer,
    Buffer.from(nonce, binaryEncoding),
    Buffer.from(key, binaryEncoding)
  )
  return ciphertextBuffer.toString(ciphertextEncoding)
}

function decrypt ({ ciphertext, encoding, nonce, key }) {
  const ciphertextBuffer = decode(ciphertext, ciphertextEncoding)
  const plaintextBuffer = Buffer.alloc(
    ciphertextBuffer.length - macBytes
  )
  const result = sodium.crypto_secretbox_open_easy(
    plaintextBuffer,
    ciphertextBuffer,
    Buffer.from(nonce, binaryEncoding),
    Buffer.from(key, binaryEncoding)
  )
  if (!result) return false
  return encode(plaintextBuffer, encoding)
}

// Signature

export const seedBytes = sodium.crypto_sign_SEEDBYTES
export const generateKeyPairSeed = () => randomHex(seedBytes)
export const publicKeyBytes = sodium.crypto_sign_PUBLICKEYBYTES
export const secretKeyBytes = sodium.crypto_sign_SECRETKEYBYTES

export const generateKeyPairFromSeed = seed => {
  assert(typeof seed === 'string')
  const publicKeyBuffer = Buffer.alloc(publicKeyBytes)
  const secretKeyBuffer = Buffer.alloc(secretKeyBytes)
  sodium.crypto_sign_seed_keypair(
    publicKeyBuffer,
    secretKeyBuffer,
    Buffer.from(seed, binaryEncoding)
  )
  return {
    secretKey: secretKeyBuffer.toString(binaryEncoding),
    publicKey: publicKeyBuffer.toString(binaryEncoding)
  }
}

export const generateKeyPair = () => {
  const publicKeyBuffer = Buffer.alloc(publicKeyBytes)
  const secretKeyBuffer = Buffer.alloc(secretKeyBytes)
  sodium.crypto_sign_keypair(publicKeyBuffer, secretKeyBuffer)
  return {
    publicKey: publicKeyBuffer.toString(binaryEncoding),
    secretKey: secretKeyBuffer.toString(binaryEncoding)
  }
}

export const signatureBytes = sodium.crypto_sign_BYTES

export const signJSON = ({ message, secretKey }) => {
  return sign({ message, encoding: 'json', secretKey })
}

export const verifyJSON = ({ message, signature, publicKey }) => {
  return verify({ message, encoding: 'json', signature, publicKey })
}

export const signString = ({ message, secretKey }) => {
  return sign({ message, encoding: 'utf8', secretKey })
}

export const verifyString = ({ message, signature, publicKey }) => {
  return verify({ message, encoding: 'utf8', signature, publicKey })
}

export const signBinary = ({ message, secretKey }) => {
  return sign({ message, encoding: ciphertextEncoding, secretKey })
}

export const verifyBinary = ({ message, signature, publicKey }) => {
  return verify({ message, encoding: ciphertextEncoding, signature, publicKey })
}

function sign ({ message, encoding, secretKey }) {
  assert(typeof secretKey === 'string')
  const signatureBuffer = Buffer.alloc(signatureBytes)
  sodium.crypto_sign_detached(
    signatureBuffer,
    decode(message, encoding),
    Buffer.from(secretKey, binaryEncoding)
  )
  return signatureBuffer.toString(binaryEncoding)
}

function verify ({ message, encoding, signature, publicKey }) {
  assert(typeof signature === 'string')
  assert(typeof publicKey === 'string')
  return sodium.crypto_sign_verify_detached(
    Buffer.from(signature, binaryEncoding),
    decode(message, encoding),
    Buffer.from(publicKey, binaryEncoding)
  )
}

function encode (buffer, encoding) {
  assert(Buffer.isBuffer(buffer))
  if (encoding === binaryEncoding || encoding === ciphertextEncoding || encoding === 'utf8') {
    return buffer.toString(encoding)
  }
  if (encoding === 'json') {
    return JSON.parse(buffer)
  }
  throw new Error('unsupported encoding: ' + encoding)
}

function decode (message, encoding) {
  assert(message !== undefined)
  if (encoding === binaryEncoding || encoding === ciphertextEncoding || encoding === 'utf8') {
    return Buffer.from(message, encoding)
  }
  if (encoding === 'json') {
    return Buffer.from(stringify(message), 'utf8')
  }
  throw new Error('unsupported encoding: ' + encoding)
}

// Envelopes

export const envelop = ({
  entry,
  publicKey,
  journalKeyPair,
  projectKeyPair,
  encryptionKey
}) => {
  assert(typeof entry === 'object')
  assert(typeof journalKeyPair === 'object')
  assert(typeof journalKeyPair.publicKey === 'string')
  assert(typeof journalKeyPair.secretKey === 'string')
  assert(typeof projectKeyPair === 'object')
  assert(typeof projectKeyPair.publicKey === 'string')
  assert(typeof projectKeyPair.secretKey === 'string')
  const index = entry.index
  assert(Number.isSafeInteger(index))
  assert(index >= 0)
  if (index > 0) assert(typeof entry.prior === 'string')
  const nonce = generateNonce()
  const ciphertext = encryptJSON({
    plaintext: entry,
    nonce,
    key: encryptionKey
  })
  const envelope = {
    version: '1.0.0-pre',
    discoveryKey: entry.discoveryKey,
    index: entry.index,
    prior: entry.prior,
    journalPublicKey: journalKeyPair.publicKey,
    journalSignature: signBinary({
      message: ciphertext,
      secretKey: journalKeyPair.secretKey
    }),
    projectSignature: signBinary({
      message: ciphertext,
      secretKey: projectKeyPair.secretKey
    }),
    entry: { ciphertext, nonce }
  }
  return envelope
}

export const verifyEnvelope = ({
  envelope,
  projectPublicKey,
  encryptionKey
}) => {
  assert(typeof envelope === 'object')
  assert(typeof projectPublicKey === 'string')
  assert(typeof encryptionKey === 'string')

  const errors = []

  function report (message, flag) {
    const error = new Error(message)
    error[flag] = true
    errors.push(error)
  }

  // Verify Signatures
  const ciphertext = envelope.entry.ciphertext
  const validJournalSignature = verifyBinary({
    message: ciphertext,
    signature: envelope.journalSignature,
    publicKey: envelope.journalPublicKey
  })
  if (!validJournalSignature) {
    report('invalid journal signature', 'journalSignature')
  }
  const validProjectSignature = verifyBinary({
    message: ciphertext,
    signature: envelope.projectSignature,
    publicKey: projectPublicKey
  })
  if (!validProjectSignature) {
    report('invalid project signature', 'projectSignature')
  }

  // Verify Entry
  if (encryptionKey) {
    const entry = decryptJSON({
      ciphertext: envelope.entry.ciphertext,
      nonce: envelope.entry.nonce,
      key: encryptionKey
    })
    if (!entry) {
      report('could not decrypt entry', 'encryption')
    } else {
      if (entry.discoveryKey !== envelope.discoveryKey) {
        report('discoveryKey mismatch', 'discoveryKey')
      }
      if (entry.index !== envelope.index) {
        report('index mismatch', 'index')
      }
      if (entry.index > 0 && !envelope.prior) {
        report('envelope missing prior digest', 'envelopePrior')
      }
      if (entry.index > 0 && !entry.prior) {
        report('entry missing prior digest', 'entryPrior')
      }
    }
  }

  return errors
}

export const decryptEntry = ({
  envelope,
  encryptionKey
}) => {
  assert(typeof envelope === 'object')
  assert(typeof encryptionKey === 'string')

  return decryptJSON({
    ciphertext: envelope.entry.ciphertext,
    nonce: envelope.entry.nonce,
    key: encryptionKey
  })
}

// Invitations

const invitationEncrypted = ['encryptionKey', 'secretKey', 'title']

export const encryptInvitation = options => {
  const distributionKey = options.distributionKey
  assert(typeof distributionKey === 'string')
  const publicKey = options.publicKey
  assert(typeof publicKey === 'string')
  const encryptionKey = options.encryptionKey
  assert(typeof encryptionKey === 'string')

  const returned = { distributionKey, publicKey }
  invitationEncrypted.forEach(encryptProperty)
  return returned

  function encryptProperty (key) {
    if (!has(options, key)) return
    const encryptFunction = key === 'title' ? encryptString : encryptBinary
    const nonce = generateNonce()
    returned[key] = {
      ciphertext: encryptFunction({
        plaintext: options[key],
        nonce,
        key: encryptionKey
      }),
      nonce
    }
  }
}

export const decryptInvitation = options => {
  const invitation = options.invitation
  assert(typeof invitation === 'object')
  const encryptionKey = options.encryptionKey
  assert(typeof encryptionKey === 'string')

  const returned = {
    distributionKey: invitation.distributionKey,
    publicKey: invitation.publicKey
  }
  invitationEncrypted.forEach(decryptProperty)
  return returned

  function decryptProperty (key) {
    if (!has(invitation, key)) return
    const decryptMethod = key === 'title' ? decryptString : decryptBinary
    returned[key] = decryptMethod({
      ciphertext: invitation[key].ciphertext,
      nonce: invitation[key].nonce,
      key: encryptionKey
    })
  }
}
