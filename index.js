'use strict'

const secureRandom = require('secure-random')
const session = require('koa-session')
const crypto = require('crypto')

module.exports = function(app, opts) {
  opts = opts || {}

  if (opts.signed === undefined) {
    opts.signed = true
  }

  let key
  try {
      key = new Buffer(opts.crypto_key, 'base64')
  } catch(error) {
      throw new Error('Missing or invalid options.crypto_key', error)
  }

  const algorithm = opts.algorithm || 'aes-256-cbc'

  opts.encode = encode
  opts.decode = decode

  app.use(session(app, opts))

  function encode(body) {
      try {
          body = JSON.stringify(body)
          let base64 = new Buffer(body).toString('base64')
          return encrypt(base64, key, algorithm)
      } catch(err) {
          console.error('@steem/koa-crypto-session: encode error resetting session', body, err);
          return encrypt(new Buffer('').toString('base64'), key, algorithm);
      }
  }
  
  function decode(text) {
    try {
        let body = new Buffer(decrypt(text, key, algorithm), 'base64').toString('utf8')
        let json = JSON.parse(body)

        // check if the cookie is expired
        if (!json._expire) return null
        if (json._expire < Date.now()) return null

        return json
    } catch(err) {
        console.error('@steem/koa-crypto-session: decode error resetting session', body, err);
        return {};
    }
  }
}

function encrypt(text, key, algorithm) {
    const iv = secureRandom.randomBuffer(16)
    let cipher = crypto.createCipheriv(algorithm, key, iv)
    let crypted = `crypto-session:${iv.toString('base64')} ${cipher.update(text, 'utf8', 'base64')}`
    crypted += cipher.final('base64')
    return crypted
}

function decrypt(text, key, algorithm) {
    try {
        if(!/^crypto-session:/.test(text))
            throw new Error('Unrecognized encrypted session format.')

        text = text.substring('crypto-session:'.length)
        const space = text.indexOf(' ')
        const iv = new Buffer(text.substring(0, space), 'base64')
        const ciphertext = text.substring(space + 1)
        let decipher = crypto.createDecipheriv(algorithm, key, iv)
        let dec = decipher.update(ciphertext, 'base64', 'utf8')
        dec += decipher.final('utf8')

        return dec
    } catch(error) {
        try {
            JSON.parse(new Buffer(body, 'base64').toString('utf8')) // Is JSON?
            console.log('@steem/koa-crypto-session: Encrypting plaintext session.', text)
            return body
        } catch(error2) {// debug('decode %j error: %s', json, err);
            throw new Error('@steem/koa-crypto-session: Discarding session.', error, text)
        }
    }
}

module.exports.unitTest_decrypt = decrypt
