const assert = require('assert')
const AWS = require('aws-sdk')

const Delimiter = exports.DELIMITER = '/'
const Bucket = process.env.S3_BUCKET
const ServerSideEncryption = 'AES256'

const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(process.env.S3_ENDPOINT),
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY
})

exports.first = (prefix, callback) => {
  assert(typeof prefix === 'string')
  assert(typeof callback === 'function')
  s3.listObjects({
    Bucket,
    Delimiter,
    Prefix: prefix,
    MaxKeys: 1
  }, (error, data) => {
    if (error) {
      if (error.code === 'NoSuchKey') return callback(null, 0)
      return callback(error)
    }
    const contents = data.Contents
    if (contents.length === 0) return callback(null, undefined)
    callback(null, contents[0].Key)
  })
}

exports.delete = (key, callback) => {
  assert(typeof key === 'string')
  assert(typeof callback === 'function')
  s3.deleteObject({ Bucket, Key: key }, callback)
}

exports.get = (key, callback) => {
  assert(typeof key === 'string')
  assert(typeof callback === 'function')
  s3.getObject({ Bucket, Key: key }, (error, data) => {
    if (error) {
      if (error.code === 'NoSuchKey') return callback(null, undefined)
      return callback(error)
    }
    let parsed
    try {
      parsed = JSON.parse(data.Body)
    } catch (error) {
      return callback(error)
    }
    callback(null, parsed)
  })
}

exports.put = (key, value, callback) => {
  assert(typeof key === 'string')
  assert(value !== undefined)
  assert(typeof callback === 'function')
  s3.putObject({
    Bucket,
    Key: key,
    Body: Buffer.from(JSON.stringify(value)),
    ContentType: 'application/json',
    ServerSideEncryption
  }, error => {
    if (error) return callback(error)
    callback(null, true)
  })
}

exports.list = (prefix, callback) => {
  assert(typeof prefix === 'string')
  assert(typeof callback === 'function')
  recurse(false, callback)
  function recurse (marker, done) {
    const options = { Bucket, Delimiter, Prefix: prefix }
    if (marker) options.Marker = marker
    s3.listObjects(options, (error, data) => {
      if (error) {
        if (error.code === 'NoSuchKey') return callback(null, [])
        return callback(error)
      }
      const contents = data.Contents.map(element => element.Key)
      if (data.IsTruncated) {
        return recurse(data.NextMarker, (error, after) => {
          if (error) return done(error)
          done(null, contents.concat(after))
        })
      }
      done(null, contents)
    })
  }
}

exports.exists = (key, callback) => {
  assert(typeof key === 'string')
  assert(typeof callback === 'function')
  s3.headObject({ Bucket, Key: key }, (error, data) => {
    if (error) {
      if (error.code === 'NotFound') return callback(null, false)
      return callback(error)
    }
    callback(null, true)
  })
}
