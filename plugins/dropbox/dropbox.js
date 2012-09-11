var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , qs = require('querystring')

var dropbox_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'dropbox-config.json'), 'utf-8' ) )

exports.Dropbox = (function(){
  
  var ACCOUNT_INFO_URI = 'https://api.dropbox.com/1/account/info'
    , API_URI = 'https://api.dropbox.com/1'
    , CONTENT_API_URI = 'https://api-content.dropbox.com/1'
    , METADATA_URI = 'https://api.dropbox.com/1/metadata'
    , SEARCH_URI = 'https://api.dropbox.com/1/search'
    , FILES_GET_URI = 'https://api-content.dropbox.com/1/files'
    , FILES_PUT_URI = 'https://api-content.dropbox.com/1/files_put'
  
  return {
    config: dropbox_config,
    getNewRequestToken: function(req,res,cb){

      var url = dropbox_config.request_token_url
        , oauth = { 
                    consumer_key: dropbox_config.app_key
                  , consumer_secret: dropbox_config.app_secret
                  }

      // Create your auth_url for the view   
      request.post({url:url, oauth:oauth}, function (e, r, body) {

        if(e) return cb(e,null)
        
        return cb(null,qs.parse(body))

      }) // end request.post()

    },
    getRemoteAccessToken: function(access_token, request_token_secret, cb){

      var url = dropbox_config.access_token_url
        , oauth = { 
                    consumer_key: dropbox_config.app_key
                  , consumer_secret: dropbox_config.app_secret
                  , token: access_token
                  , token_secret: request_token_secret
                  }

      // Create your auth_url for the view   
      request.get({url:url, oauth:oauth}, function (e, r, body) {

        if(e) return cb(e,null)
        
        return cb(null,qs.parse(body))

      }) // end request.get()
      
    }, // end getRemoteAccessToken()
    getAccountInfo: function(dropbox_obj, cb){
      
      var oauth = { 
                    consumer_key: dropbox_config.app_key
                  , consumer_secret: dropbox_config.app_secret
                  , token: dropbox_obj.oauth.access_token
                  , token_secret: dropbox_obj.oauth.access_token_secret
                  }

      request.get({url: ACCOUNT_INFO_URI, oauth:oauth}, function (e, r, b) {

        if(e) return cb(e,null)

        return cb(null,b)

      }) // end request.post()

      
    }, // end getAccountInfo()
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

