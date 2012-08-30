var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , qs = require('querystring')

var twitter_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'twitter-config.json'), 'utf-8' ) )

function createAuthHeaders(_oauth, uri, method){

  var form = {}
  var oa = {}
  for (var i in form) oa[i] = form[i]
  for (var i in _oauth) oa['oauth_'+i] = _oauth[i]
  if (!oa.oauth_version) oa.oauth_version = '1.0'
  if (!oa.oauth_timestamp) oa.oauth_timestamp = Math.floor( (new Date()).getTime() / 1000 ).toString()
  if (!oa.oauth_nonce) oa.oauth_nonce = uuid().replace(/-/g, '')
  
  oa.oauth_signature_method = 'HMAC-SHA1'
  
  var consumer_secret = oa.oauth_consumer_secret
  delete oa.oauth_consumer_secret
  var token_secret = oa.oauth_token_secret
  delete oa.oauth_token_secret
  
  var baseurl = uri.protocol + '//' + uri.host + uri.pathname
  var signature = hmacsign(method, baseurl, oa, consumer_secret, token_secret)
  
  // oa.oauth_signature = signature
  // Not used?
  for (var i in form) {
    console.log('i in form '+ i)
    if ( i.slice(0, 'oauth_') in _oauth) {
      // skip 
      console.log('skipping')
    } else {
      delete oa['oauth_'+i]
    }
  }
  var authorization = 
    'Authorization: OAuth '+Object.keys(oa).sort().map(function (i) {return i+'="'+rfc3986(oa[i])+'"'}).join(', ')

  authorization += ', oauth_signature="'+rfc3986(signature)+'"'
  
  return authorization

  
}

// Twitter OAuth
exports.Twitter = {
  config: twitter_config,
  logOAuthData: function(req){
    // useful for debuggin oauth nightmare
    
    var oauth = req.session.twitter.oauth
    var uri = 'https://upload.twitter.com/1/statuses/update_with_media.json'
    var method = 'POST'
    
    var authHeaders = createAuthHeaders(oauth, uri, method )
    console.log('\n\n')
    console.log('\n\n')
    console.dir(authHeaders)
    
    var command = 'curl --request \'POST\' \'https://upload.twitter.com/1/statuses/update_with_media.json\' '+
                  '--header \''+authHeaders+'\' -F "media[]=@/Users/joemccann/Documents/workspace/photopipe/public/outbound/pipe.jpg"'+
                  ' -F "status=Test" --header "Expect: "'

    console.log('\n\n'+command+'\n\n')
    
  },
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
    
    if(!req.session.twitter.oauth){
      res.type('text/plain')
      return res.status(403).send("You are not authenticated with Facebook.")
    } 
    
    // TODO: EVENTUALLY WE WILL NEED TO CHECK THE 
    // https://api.twitter.com/1/help/configuration.json
    // RESPONSE THAT CONTAINS SHORT URL CHARS AND MAX MEDIA UPLOADS
    // SEE https://dev.twitter.com/docs/api/1/get/help/configuration
    
    var oauth = req.session.twitter.oauth
    var uri = 'https://upload.twitter.com/1/statuses/update_with_media.json'
    var method = 'POST'

    var r = request.post({
      oauth: req.session.twitter.oauth,
      uri: uri,
      callback: function(e,r,data){
        if(e) {
          console.error(e)
          return res.json(e)
        }
        if(data) {
          // NOTE:  If the user tries to exceed the number of updates allowed, 
          // this method will also return an HTTP 403 error, similar to POST statuses/update.
          // TODO: CHECK FOR THIS!!
          return res.json(data)
        }        
      }
    })

    var form = r.form()
    form.append('status', echo.caption || "photopi.pe")
    form.append('media[]', fs.createReadStream(echo.fullPhotoPath))
   
    
  }
} // end exports.Twitter


