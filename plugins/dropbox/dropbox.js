var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , qs = require('querystring')
  , Oauth = require('oauth').OAuth

var dropbox_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'dropbox-config.json'), 'utf-8' ) )
/*
exports.Dropbox = (function(){
  
  return {
    config: dropbox_config,
    generateAuthUrl: function(req,res,cb){

      var url = dropbox_config.request_token_url
        , oauth = { 
                    callback: encodeURI(dropbox_config.callback_url)
                    , consumer_key: dropbox_config.app_key
                    , consumer_secret: dropbox_config.app_secret
                  }

      // Create your auth_url for the view   
      request.post({url:url, oauth:oauth, proxy: 'http://127.0.0.1:8888'}, function (e, r, body) {

        if(e) return cb(e,null)

        var query = qs.parse(body)
        console.dir(query)
        // Set oauth_token_secret and oauth_token in config
        dropbox_config.oauth_token_secret = query.oauth_token_secret
        dropbox_config.oauth_token = query.oauth_token
        console.dir(dropbox_config)

        var auth_url = dropbox_config.auth_url + "?" + body + "&oauth_callback="+ dropbox_config.callback_url

        console.log(auth_url + " is the auth_url for dropbox")      

        cb(null,auth_url)

      }) // end request.post()

    },
    getRemoteAccessToken: function(access_token, cb){
      console.log('oauth token here: ' + access_token)
      _oauth.get( 
                  ACCESS_TOKEN_URI, 
                  access_token, 
                  _request_token_secret, 
                  function(err, data, res){
                    if (err) return cb(err)
                    else {
                      var d = qs.parse(data)
                      _access_token_secret = d.oauth_token_secret
                      _access_token = d.oauth_token
                      cb(null, d)
                  }
      }) // end _oauth.get()
    }, // end getAccessToken()
    searchForPhotos: function(req,res){
      res.send('not implemented yet')
    },
    getNextPageUserRecentPhotos: function(req,res){
      
      var url = req.query.next_page_url

      request({url: url}, function(e,r,b){
        if(e) {
          console.error(e)
          return res.json(e)
        }
        var parsedBody = JSON.parse(b)
        var respJson = parsedBody.data
        // In order to keep the response from instagram API
        // similar to the response that is sent back by the 
        // instagram node module, we need to change it a bit
        // by pushing this object on the end of the array.
        respJson.push(parsedBody.pagination)
        return res.json(respJson)
      })

    }
  }
  
})()
*/

var OAuth = require('oauth').OAuth

var config = dropbox_config

exports.Dropbox = (function(){
  
  var _oauth
    , API_URI = 'https://api.dropbox.com/1'
    , CONTENT_API_URI = 'https://api-content.dropbox.com/1'
    , REQUEST_TOKEN_URI = 'https://api.dropbox.com/1/oauth/request_token'
    , ACCESS_TOKEN_URI = 'https://api.dropbox.com/1/oauth/access_token'
    , METADATA_URI = 'https://api.dropbox.com/1/metadata'
    , ACCOUNT_INFO_URI = 'https://api.dropbox.com/1/account/info'
    , SEARCH_URI = 'https://api.dropbox.com/1/search'
    , FILES_GET_URI = 'https://api-content.dropbox.com/1/files'
    , FILES_PUT_URI = 'https://api-content.dropbox.com/1/files_put'

  // Constructor...
  !function(){

    // Create OAuth client.
    _oauth = new OAuth(API_URI + '/oauth/request_token'
                              , API_URI + '/oauth/access_token'
                              , config.app_key, config.app_secret
                              , '1.0', null, 'HMAC-SHA1')
                              
  }()
  
  // Public API Object
  return {
    config: config,
    getNewRequestToken: function(cb){

      _oauth.get( REQUEST_TOKEN_URI, null, null, function(err, data, res){
        if (err) {
          console.error(err)
          cb(err)
        }
        else {
          var d = qs.parse(data)
          cb(null, data)
        }

      })  // end _oauth.get()
    },
    getRemoteAccessToken: function(access_token, request_token_secret, cb){
      _oauth.get( 
                  ACCESS_TOKEN_URI, 
                  access_token, 
                  request_token_secret, 
                  function(err, data, res){
                    
                    if (err) return cb(err)

                    var d = qs.parse(data)
                    cb(null, d)
                  }) // end _oauth.get()
    }, // end getRemoteAccessToken()
    getAccountInfo: function(dropbox_obj, cb){
      
      _oauth.get( ACCOUNT_INFO_URI
                  , dropbox_obj.oauth.access_token
                  , dropbox_obj.oauth.access_token_secret
                  , function(err, data, res){
                    if(err) return cb(err)
                    else{
                      cb(null, data)
                    }
                  })
    }, // end getAccountInfo()
    searchForPhotos: function(req,res){
      res.send('Sorry, not implemented yet. :(')
    },
    searchForMdFiles: function(cb){

      // *sigh* http://forums.dropbox.com/topic.php?id=50266&replies=1
      _oauth.get( SEARCH_URI + "/dropbox/?query=.md&file_limit=500"
                  , _access_token
                  , _access_token_secret
                  , function(err, data, res) {
                      if(err) return cb(err)
                      else{
                        cb(null, data)
                      }
                  })
      
    }, // searchForMdFiles
    getMdFile: function(pathToFile, cb){

      _oauth.get( FILES_GET_URI + "/dropbox" + pathToFile
                  , _access_token
                  , _access_token_secret
                  , function(err, data, res) {
                      if(err) return cb(err)
                      else{
                        cb(null, data)
                      }
                  })
      
    }, // getMdFile()
    putMdFile: function(pathToFile, fileContents, cb){

      // https://github.com/ciaranj/node-oauth/blob/master/lib/oauth.js#L472-474
      // exports.OAuth.prototype.post= function(url, oauth_token, oauth_token_secret, post_body, post_content_type, callback)
      
      // https://www.dropbox.com/developers/reference/api#files_put
      
      var params = qs.stringify({overwrite: 'true'})
      _oauth.put( FILES_PUT_URI + "/dropbox" + pathToFile + "?" + params
                  , _access_token
                  , _access_token_secret
                  , fileContents
                  , 'text/plain'
                  , function(err, data, res) {
                      if(err) return cb(err)
                      else{
                        cb(null, data)
                      }
                  })
      
    } // putMdFile()
  
  } // end public API object
  
})() // end Dropbox()

