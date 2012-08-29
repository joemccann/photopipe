var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , qs = require('querystring')
  , exec = require('child_process').exec
  , crypto = require('crypto')

var twitter_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'twitter-config.json'), 'utf-8' ) )

function uuid(){

  var s = [], itoh = '0123456789ABCDEF';

  // Make array of random hex digits. The UUID only has 32 digits in it, but we
  // allocate an extra items to make room for the '-'s we'll be inserting.
  for (var i = 0; i <36; i++) s[i] = Math.floor(Math.random()*0x10);

  // Conform to RFC-4122, section 4.4
  s[14] = 4;  // Set 4 high bits of time_high field to version
  s[19] = (s[19] & 0x3) | 0x8;  // Specify 2 high bits of clock sequence

  // Convert to hex chars
  for (var i = 0; i <36; i++) s[i] = itoh[s[i]];

  // Insert '-'s
  s[8] = s[13] = s[18] = s[23] = '-';

  return s.join('');

  
}

function sha1 (key, body) {
  return crypto.createHmac('sha1', key).update(body).digest('base64')
}

function rfc3986 (str) {
  return encodeURIComponent(str)
    .replace(/!/g,'%21')
    .replace(/\*/g,'%2A')
    .replace(/\(/g,'%28')
    .replace(/\)/g,'%29')
    .replace(/'/g,'%27')
    ;
}

function hmacsign (httpMethod, base_uri, params, consumer_secret, token_secret, body) {
  // adapted from https://dev.twitter.com/docs/auth/oauth
  var base = 
    (httpMethod || 'GET') + "&" +
    encodeURIComponent(  base_uri ) + "&" +
    Object.keys(params).sort().map(function (i) {
      // big WTF here with the escape + encoding but it's what twitter wants
      return escape(rfc3986(i)) + "%3D" + escape(rfc3986(params[i]))
    }).join("%26")
  var key = encodeURIComponent(consumer_secret) + '&'
  if (token_secret) key += encodeURIComponent(token_secret)
  return sha1(key, base)
}

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
    // TODO: Not sure if this check goes here or in pipePhotoToTwiter() in twitter.js plugin 
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
    
    var authHeaders = createAuthHeaders(oauth, uri, method )
    console.dir(echo)
    console.dir(authHeaders)
    
    var command = 'curl --request \'POST\' \'https://upload.twitter.com/1/statuses/update_with_media.json\' '+
                  '--header \''+authHeaders+'\' -F "media[]=@'+echo.fullPhotoPath+'" -F "status='+echo.caption+'" --header "Expect: "'

    console.log('\n\n'+command+'\n\n')

    exec(command, function(err,data){
      if(err) {
        console.error(err)
        return res.json(err)
      }
      if(data) {
        console.dir(data,8)
        // NOTE:  If the user tries to exceed the number of updates allowed, 
        // this method will also return an HTTP 403 error, similar to POST statuses/update.
        // TODO: CHECK FOR THIS!!
        return res.json(JSON.parse(data))
      }
    }) // end exec()
    
  }
} // end exports.Twitter


