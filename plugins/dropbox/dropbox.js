var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , qs = require('querystring')
  , _ = require('lodash')

var dropbox_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'dropbox-config.json'), 'utf-8' ) )

exports.Dropbox = (function(){
  
  var ACCOUNT_INFO_URI = 'https://api.dropbox.com/1/account/info'
    , API_URI = 'https://api.dropbox.com/1'
    , CONTENT_API_URI = 'https://api-content.dropbox.com/1'
    , METADATA_URI = 'https://api.dropbox.com/1/metadata/dropbox/Photos'
    , SEARCH_URI = 'https://api.dropbox.com/1/search/dropbox'
    , FILES_GET_URI = 'https://api-content.dropbox.com/1/files/dropbox'
    , FILES_PUT_URI = 'https://api-content.dropbox.com/1/files_put/dropbox/PhotoPipe/'
    , THUMBNAILS_URI = 'https://api-content.dropbox.com/1/thumbnails/dropbox'
    , DELTA_URI = 'https://api.dropbox.com/1/delta'
  
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
    searchForPhotos: function(dropbox_obj,cb){
      
      var oauth = { 
                    consumer_key: dropbox_config.app_key
                  , consumer_secret: dropbox_config.app_secret
                  , token: dropbox_obj.oauth.access_token
                  , token_secret: dropbox_obj.oauth.access_token_secret
                  }
                  
      var totalPhotoCalls = 4
        , totalPhotoObj = {}
      
      function getPhoto(type){
      
        request.get({url: SEARCH_URI + "?query=."+type, oauth:oauth}, function (e, r, b) {

          if(e) return cb(e,null)

          totalPhotoCalls--
          b = JSON.parse(b)
          totalPhotoObj = _.merge(totalPhotoObj, b)
      
          if(!totalPhotoCalls) return cb(null,totalPhotoObj)

        }) // end request.post()
        
      }

      getPhoto('jpg')
      getPhoto('png')
      getPhoto('jpeg')
      getPhoto('gif')
      
    },
    pipeToDropbox: function(echo, req, res){

      if(!req.session.dropbox.oauth){
        res.type('text/plain')
        return res.status(403).send("You are not authenticated with Dropbox.")
      } 

      var oauth = { 
                    consumer_key: dropbox_config.app_key
                  , consumer_secret: dropbox_config.app_secret
                  , token: req.session.dropbox.oauth.access_token
                  , token_secret: req.session.dropbox.oauth.access_token_secret
                  }

      var file = fs.readFileSync(echo.fullPhotoPath)
      
      request.put({
        oauth: oauth,
        uri: FILES_PUT_URI + echo.photoName,
        body: file, 
        callback: function(e,r,data){
          if(e) {
            console.error(e)
            return res.json(e)
          }
          if(data) {
            return res.json(data)
          }        
        }
      })

    } // end pipeToDropbox
  }
  
})()

