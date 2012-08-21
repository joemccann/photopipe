var fs = require('fs')
  , path = require('path')

var instagram_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'instagram-config.json'), 'utf-8' ) )

var Instagram = require('instagram-node-lib')

Instagram.set('client_id', instagram_config.client_id)
Instagram.set('client_secret', instagram_config.client_secret)
Instagram.set('redirect_uri', instagram_config.redirect_uri)

// to be set later after auth...
Instagram._user = null

exports.Instagram = Instagram