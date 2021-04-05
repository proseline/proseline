// JSON Schemas and validation functions

import AJV from 'ajv'
import addFormats from 'ajv-formats'
import assert from 'assert'
import {
  digestBytes,
  distributionKeyBytes,
  nonceBytes,
  publicKeyBytes,
  signatureBytes
} from './crypto.js'

// Helper Functions

const base64Pattern = (() => {
  const chars = '[A-Za-z0-9+/]'
  return `^(${chars}{4})*(${chars}{2}==|${chars}{3}=)?$`
})()

function base64String (bytes) {
  const schema = { type: 'string', pattern: base64Pattern }
  if (bytes) {
    assert(Number.isSafeInteger(bytes))
    assert(bytes > 0)
    const length = Buffer.alloc(bytes).toString('base64').length
    schema.minLength = length
    schema.maxLength = length
  } else {
    schema.minLength = 4
  }
  return schema
}

const hexPattern = '^[a-f0-9]+$'

function hexString (bytes) {
  const schema = { type: 'string', pattern: hexPattern }
  if (bytes) {
    assert(Number.isSafeInteger(bytes))
    assert(bytes > 0)
    const length = Buffer.alloc(bytes).toString('hex').length
    schema.minLength = length
    schema.maxLength = length
  } else {
    schema.minLength = 1
  }
  return schema
}

// Helper Subschemas

const index = { type: 'integer', minimum: 0 }
const name = { type: 'string', minLength: 1, maxLength: 256 }
const timestamp = { type: 'string', format: 'date-time' }
const text = { type: 'string', minLength: 1 }

const digest = hexString(digestBytes)
const discoveryKey = hexString(digestBytes)
const distributionKey = hexString(distributionKeyBytes)
const nonce = hexString(nonceBytes)
const publicKey = hexString(publicKeyBytes)
const signature = hexString(signatureBytes)

const encrypted = {
  type: 'object',
  properties: { nonce, ciphertext: base64String() },
  required: ['nonce', 'ciphertext'],
  additionalProperties: false
}

// Journal Entries

// Intros to associate a personal and device name with subsequent
// journal entries.
//
// Intros serve the same role as [user] data in ~/.gitconfig.
export const intro = {
  type: 'object',
  properties: {
    type: { const: 'intro' },
    version: { const: '1.0.0-pre' },
    name, // e.g. "Kyle E. Mitchell"
    device: name, // e.g. "laptop"
    email: { type: 'string', format: 'email' }, // optional
    timestamp
  },
  required: ['type', 'version', 'name', 'device', 'timestamp'],
  additionalProperties: false
}

// Drafts contain the content of a version of a document.
//
// Drafts work like commits in Git.
export const draft = {
  type: 'object',
  properties: {
    type: { const: 'draft' },
    version: { const: '1.0.0-pre' },
    parents: {
      type: 'array',
      items: digest,
      maxItems: 2,
      uniqueItems: true
    },
    content: { type: 'object' },
    timestamp
  },
  required: ['type', 'version', 'parents', 'content', 'timestamp'],
  additionalProperties: false
}

// Marks associate a name with a draft.
//
// They can be moved from draft to draft over time.
//
// Marks work like branches and tags in Git.
export const mark = {
  type: 'object',
  properties: {
    type: { const: 'mark' },
    version: { const: '1.0.0-pre' },
    identifier: hexString(4),
    name,
    timestamp,
    draft: digest
  },
  required: [
    'type',
    'version',
    'identifier',
    'name',
    'timestamp',
    'draft'
  ],
  additionalProperties: false
}

// Notes associate text with ranges of text within drafts.
//
// Notes work like comments in word processors.
export const note = {
  type: 'object',
  properties: {
    type: { const: 'note' },
    version: { const: '1.0.0-pre' },
    draft: digest,
    range: {
      type: 'object',
      properties: {
        start: { type: 'integer', minimum: 0 },
        end: { type: 'integer', minimum: 1 }
      },
      required: ['start', 'end'],
      additionalProperties: false
    },
    text,
    timestamp
  },
  required: [
    'type',
    'version',
    'draft',
    'range',
    'text',
    'timestamp'
  ],
  additionalProperties: false
}

// Replies associate text with notes.
export const reply = {
  type: 'object',
  properties: {
    type: { const: 'reply' },
    version: { const: '1.0.0-pre' },
    draft: digest,
    parent: digest,
    text,
    timestamp
  },
  required: [
    'type',
    'version',
    'draft',
    'parent',
    'text',
    'timestamp'
  ],
  additionalProperties: false
}

// Corrections replace the texts of notes and replies.
//
// When users make typos or mistakes in notes or replies,
// they use corrections to fix them.
export const correction = {
  type: 'object',
  properties: {
    type: { const: 'correction' },
    version: { const: '1.0.0-pre' },
    note: digest,
    text,
    timestamp
  },
  required: [
    'type',
    'version',
    'note',
    'text',
    'timestamp'
  ],
  additionalProperties: false
}

const entryTypes = { intro, draft, mark, note, reply, correction }

// Add journal-entry properties to each entry type schema.
Object.keys(entryTypes).forEach(key => {
  const schema = entryTypes[key]
  Object.assign(schema.properties, {
    discoveryKey,
    index,
    // The first entry in a journal does not include the digest
    // of a prior entry.
    prior: digest // optional
  })
  schema.required.push('index', 'discoveryKey')
})

export const entry = {
  type: 'object',
  oneOf: Object.values(entryTypes)
}

// Transport

// Envelopes wrap encrypted entries with signatures
// and indexing information.
export const envelope = {
  type: 'object',
  properties: {
    version: { const: '1.0.0-pre' },
    discoveryKey,
    journalPublicKey: publicKey,
    journalSignature: signature,
    projectSignature: signature,
    index,
    prior: digest, // optional
    // The first entry in a journal does not include the digest
    // of a prior entry.
    entry: encrypted
  },
  required: [
    'version',
    'discoveryKey',
    'journalPublicKey',
    'journalSignature',
    'projectSignature',
    'index',
    'entry'
  ],
  additionalProperties: false
}

// Invitations communicate the keys needed to join a project.
//
// Users send invitations to the server, which forwards them
// to the user's other devices.
export const invitation = {
  type: 'object',
  properties: {
    version: { const: '1.0.0-pre' },
    distributionKey,
    publicKey,
    secretKey: encrypted, // optional
    readKey: encrypted, // optional
    title: encrypted // optional
  },
  required: ['version', 'distributionKey', 'publicKey'],
  additionalProperties: false
}

// Export Validation Functions
export const validate = {}
const ajv = new AJV()
addFormats(ajv)
const schemas = {
  intro,
  draft,
  mark,
  note,
  reply,
  correction,
  entry,
  envelope,
  invitation
}
Object.keys(schemas).forEach(key => {
  const compiled = ajv.compile(schemas[key])
  validate[key] = data => {
    const valid = compiled(data)
    return { valid, errors: valid ? [] : compiled.errors }
  }
})
