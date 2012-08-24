var fs = require('fs')
  , path = require('path')

var facebook_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'facebook-config.json'), 'utf-8' ) )

exports.Facebook = {
  config: facebook_config
}