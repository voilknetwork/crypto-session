'use strict'

const session = require('koa-session')
const crypto = require('crypto')

module.exports = function(app, opts) {
  opts = opts || {}

  if (opts.signed === undefined) {
    opts.signed = true
  }

  if(!opts.crypto_key)
    throw new Error('Missing options.crypto_key')

  const key = opts.crypto_key
  const algorithm = opts.algorithm || 'aes-256-cbc'

  opts.encode = encode
  opts.decode = decode

  app.use(session(app, opts))

  function encode(body) {
      body = JSON.stringify(body)
      let base64 = new Buffer(body).toString('base64')
      
      return encrypt(base64, key, algorithm)
  }
  
  function decode(text) {
     
      let body = new Buffer(decrypt(text, key, algorithm), 'base64').toString('utf8')
      let json = JSON.parse(body)
      
      // check if the cookie is expired
      if (!json._expire) return null
      if (json._expire < Date.now()) return null
      
      return json
  }
}


function encrypt(text, key, algorithm) {
    const iv = uniqueIv()
    let cipher = crypto.createCipheriv(algorithm, key, iv)
    let crypted = iv.toString('base64') + ' ' + cipher.update(text, 'utf8', 'base64')
    crypted += cipher.final('base64')
    return crypted
}

function decrypt(text, key, algorithm) {
    const space = text.indexOf(' ')
    if(space == -1)
        throw new Error('Unrecognized encrypted session data format.')

    const iv = new Buffer(text.substring(0, space), 'base64')
    const ciphertext = text.substring(space + 1)
    let decipher = crypto.createDecipheriv(algorithm, key, iv)
    let dec = decipher.update(ciphertext, 'base64', 'utf8')
    dec += decipher.final('utf8')

    return dec
}

let entropy = null
let unique_key_counter = 1
const module_load_time = Date.now().toString(32)

/**
    Create a pretty unique value for use as an initialization vector value.

    @arg {number} length in binary
    @return {Buffer} pretty unique value
*/
function uniqueIv() {
    if(entropy == null) {
        // some entropy to help with nodes in a cluster
        const loaded = module_load_time.substring(module_load_time.length - 5, module_load_time.length)
        let init_time = Date.now().toString(32)
        init_time = init_time.substring(init_time.length - 5, init_time.length)
        entropy = loaded + init_time
    }
    const ivStr = `${Date.now().toString(32)}:${unique_key_counter++}:${entropy}`
    const ivHash = crypto.createHash('sha256').update(ivStr).digest('binary')
    const iv = new Buffer(ivHash.substring(0, 16), 'binary')
    return iv
}
