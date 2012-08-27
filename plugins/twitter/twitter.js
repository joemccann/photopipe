var twitter = require('ntwitter')
  , fs = require('fs')
  , path = require('path')

var twitter_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'twitter-config.json'), 'utf-8' ) )

var Twitter = new twitter({
  consumer_key: twitter_config.consumer_key,
  consumer_secret: twitter_config.consumer_secret,
  access_token_key: twitter_config.access_token,
  access_token_secret: twitter_config.access_token_secret
})