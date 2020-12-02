import AJV from 'ajv'
import * as schemas from '../schemas.js'
import tap from 'tap'
import {
  decryptBinary,
  decryptEntry,
  decryptInvitation,
  decryptString,
  encryptBinary,
  encryptInvitation,
  encryptJSON,
  encryptString,
  envelop,
  generateDiscoveryKey,
  generateDistributionKey,
  generateEncryptionKey,
  generateKeyPair,
  generateKeyPairFromSeed,
  generateKeyPairSeed,
  generateNonce,
  hash,
  hashJSON,
  randomCiphertext,
  randomHex,
  signBinary,
  signJSON,
  verifyEnvelope,
  verifyJSON
} from '../crypto.js'

const ajv = new AJV()

tap.test('encryption round trip', function (test) {
  const plaintext = 'plaintext message'
  const key = generateEncryptionKey()
  const nonce = generateNonce()
  const encrypted = encryptString({
    plaintext, nonce, key
  })
  const decrypted = decryptString({
    ciphertext: encrypted, nonce, key
  })
  test.same(plaintext, decrypted, 'identical')
  test.end()
})

tap.test('bad decryption', function (test) {
  const random = randomCiphertext(64)
  const key = generateEncryptionKey()
  const nonce = generateNonce()
  const decrypted = decryptString({
    ciphertext: random, nonce, key
  })
  test.assert(decrypted === false)
  test.end()
})

tap.test('binary encryption round trip', function (test) {
  const binary = randomHex(32)
  const key = generateEncryptionKey()
  const nonce = generateNonce()
  const encrypted = encryptBinary({
    plaintext: binary, nonce, key
  })
  const decrypted = decryptBinary({
    ciphertext: encrypted, nonce, key
  })
  test.same(binary, decrypted, 'identical')
  test.end()
})

tap.test('binary bad decryption', function (test) {
  const random = randomHex(32)
  const key = generateEncryptionKey()
  const nonce = generateNonce()
  const decrypted = decryptBinary({
    ciphertext: random, nonce, key
  })
  test.assert(decrypted === false)
  test.end()
})

tap.test('signature', function (test) {
  const keyPair = generateKeyPair()
  const object = { entry: 'plaintext message' }
  const signature = signJSON({
    message: object,
    secretKey: keyPair.secretKey
  })
  test.assert(
    verifyJSON({
      message: object,
      signature,
      publicKey: keyPair.publicKey
    })
  )
  test.end()
})

tap.test('signature with body key', function (test) {
  const keyPair = generateKeyPair()
  const object = { text: 'plaintext message' }
  const signature = signJSON({
    message: object,
    secretKey: keyPair.secretKey
  })
  test.assert(
    verifyJSON({
      message: object,
      signature,
      publicKey: keyPair.publicKey
    })
  )
  test.end()
})

tap.test('signature with keys from seed', function (test) {
  const plaintext = 'plaintext message'
  const seed = generateKeyPairSeed()
  const keyPair = generateKeyPairFromSeed(seed)
  const object = { entry: plaintext }
  const signature = signJSON({
    message: object, secretKey: keyPair.secretKey
  })
  test.assert(
    verifyJSON({
      message: object, signature, publicKey: keyPair.publicKey
    })
  )
  test.end()
})

tap.test('hash', function (test) {
  const input = 'this is some input'
  const digest = hash(input)
  test.assert(typeof digest === 'string')
  test.end()
})

tap.test('hashJSON', function (test) {
  const input = { text: 'this is some input' }
  const digest = hashJSON(input)
  test.assert(typeof digest === 'string')
  test.end()
})

tap.test('random', function (test) {
  const random = randomHex(32)
  test.assert(typeof random === 'string')
  test.end()
})

tap.test('read key', function (test) {
  const key = generateEncryptionKey()
  test.assert(typeof key === 'string')
  test.end()
})

tap.test('discovery key', function (test) {
  const distributionKey = generateDistributionKey()
  test.assert(typeof distributionKey === 'string')
  const projectDiscoverKey = generateDiscoveryKey(distributionKey)
  test.assert(typeof projectDiscoverKey === 'string')
  test.end()
})

tap.test('verify envelope', function (test) {
  const distributionKey = generateDistributionKey()
  const discoveryKey = generateDiscoveryKey(distributionKey)
  const index = 1
  const prior = hash(randomHex(64))
  const entry = {
    version: '1.0.0-pre',
    discoveryKey,
    index,
    prior,
    type: 'intro',
    name: 'Kyle E. Mitchell',
    device: 'laptop',
    timestamp: new Date().toISOString()
  }
  const journalKeyPair = generateKeyPair()
  const journalPublicKey = journalKeyPair.publicKey
  const projectKeyPair = generateKeyPair()
  const projectPublicKey = projectKeyPair.publicKey
  const encryptionKey = generateEncryptionKey()
  const nonce = generateNonce()
  const ciphertext = encryptJSON({
    plaintext: entry,
    nonce,
    key: encryptionKey
  })
  const envelope = {
    version: '1.0.0-pre',
    discoveryKey,
    journalPublicKey,
    index,
    prior,
    journalSignature: signBinary({
      message: ciphertext, secretKey: journalKeyPair.secretKey
    }),
    projectSignature: signBinary({
      message: ciphertext, secretKey: projectKeyPair.secretKey
    }),
    entry: { ciphertext, nonce }
  }
  ajv.validate(schemas.envelope, envelope)
  test.same(ajv.errors, null, 'no schema errors')
  const errors = verifyEnvelope({
    envelope, projectPublicKey, encryptionKey
  })
  test.same(errors, [], 'no signature validation errors')
  test.end()
})

tap.test('envelope generate, verify, decrypt', function (test) {
  const distributionKey = generateDistributionKey()
  const discoveryKey = generateDiscoveryKey(distributionKey)
  const journalKeyPair = generateKeyPair()
  const projectKeyPair = generateKeyPair()
  const projectPublicKey = projectKeyPair.publicKey
  const encryptionKey = generateEncryptionKey()
  const index = 1
  const prior = hash(randomHex(64))
  const entry = {
    version: '1.0.0-pre',
    discoveryKey,
    index,
    prior,
    type: 'intro',
    name: 'Kyle E. Mitchell',
    device: 'laptop',
    timestamp: new Date().toISOString()
  }
  ajv.validate(schemas.intro, entry)
  test.same(ajv.errors, null, 'no intro schema errors')
  ajv.validate(schemas.entry, entry)
  test.same(ajv.errors, null, 'no entry schema errors')
  let envelope
  test.doesNotThrow(function () {
    envelope = envelop({
      journalKeyPair,
      projectKeyPair,
      encryptionKey,
      entry
    })
  }, '.envelope() does not throw')
  ajv.validate(schemas.envelope, envelope)
  test.same(ajv.errors, null, 'no schema validation errors')
  let errors
  test.doesNotThrow(function () {
    errors = verifyEnvelope({
      envelope, projectPublicKey, encryptionKey
    })
  }, '.verifyEnvelope() does not throw')
  test.same(errors, [], '.verifyEnvelope() returns no errors')
  const decrypted = decryptEntry({ envelope, encryptionKey })
  test.same(entry, decrypted, 'decrypted')
  test.end()
})

tap.test('invitation round trip', function (test) {
  const distributionKey = generateDistributionKey()
  const keyPair = generateKeyPair()
  const publicKey = keyPair.publicKey
  const secretKey = keyPair.secretKey
  const encryptionKey = generateEncryptionKey()
  const title = 'Test Title'
  let invitation
  test.doesNotThrow(function () {
    invitation = encryptInvitation({
      distributionKey,
      publicKey,
      encryptionKey,
      secretKey,
      title
    })
  }, '.invitation() does not throw')
  const opened = decryptInvitation({
    invitation, encryptionKey
  })
  test.same(opened.secretKey, secretKey, 'secretKey')
  test.same(opened.encryptionKey, encryptionKey, 'encryptionKey')
  test.same(opened.title, title, 'title')
  test.end()
})
