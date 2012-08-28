var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , qs = require('querystring')

var twitter_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'twitter-config.json'), 'utf-8' ) )

// Twitter OAuth
exports.Twitter = {
  config: twitter_config,
  generateAuthUrl: function(req,res,cb){
    
    var url = twitter_config.request_token_URL
      , oauth = { 
                  callback: twitter_config.callback_URL
                  , consumer_key: twitter_config.consumer_key
                  , consumer_secret: twitter_config.consumer_secret
                }
    
    // Create your auth_url for the view   
    request.post({url:url, oauth:oauth}, function (e, r, body) {
      
      if(e) return cb(e,null)

      var auth_url = twitter_config.authorize_URL_https + "?" + body

      // console.log(auth_url + " is the auth_url")      

      cb(null,auth_url)

    }) // end request.post()
    
  },
  getMediaTimeline: function(req,res,cb){
    
    if(!req.session.twitter.oauth) return res.status(403).send('User not authorized. Please reauthenticate with twitter.')
    
    // console.log('We have a session so lets get media timeline')
    // var url = 'http://api.twitter.com/1/statuses/user_timeline.json?'
    var url = 'http://api.twitter.com/1/statuses/media_timeline.json?'
      , params = 
        { screen_name: req.session.twitter.oauth.screen_name
        , user_id: req.session.twitter.oauth.user_id
        , count: 200
        , include_entities: true
        , offset: 0
        , score: true
        , mode: 'photos'
        , filter: false
        }
      
    // console.dir(perm_token)
    
    url += qs.stringify(params)
    
    // console.dir(req.session.twitter.oauth)

    request.get({url:url, oauth: req.session.twitter.oauth, json:true}, function (e, r, data) {
      if(e) return console.error(e)
      // console.dir(data)
      return res.json(data)
    })

  },
  pipeToTwitter: function(echo, req, res){
    // TODO: Not sure if this check goes here or in pipePhotoToTwiter() in twitter.js plugin 
    if(!req.session.twitter.oauth){
      res.type('text/plain')
      return res.status(403).send("You are not authenticated with Facebook.")
    } 
    
    // TODO: EVENTUALLY WE WILL NEED TO CHECK THE 
    // https://api.twitter.com/1/help/configuration.json
    // RESPONSE THAT CONTAINS SHORT URL CHARS AND MAX MEDIA UPLOADS
    // SEE https://dev.twitter.com/docs/api/1/get/help/configuration
    
    var url = 'https://upload.twitter.com/1/statuses/update_with_media.json?'
      , params = 
        { status: echo.caption
        , media: [echo.fullPhotoPath]
        }
    
    url += qs.stringify(params)
    
    // console.dir(req.session.twitter.oauth)

    request.post({url:url, oauth: req.session.twitter.oauth, json:true}, function (e, r, data) {
      if(e) return console.error(e)

      console.dir(data)

      if(data.error){
        return res.status(404).send(data.error)
      }
      // NOTE:  If the user tries to exceed the number of updates allowed, 
      // this method will also return an HTTP 403 error, similar to POST statuses/update.
      // TODO: CHECK FOR THIS!!
      return res.json(data)
    })
    
    
  }
} // end exports.Twitter


