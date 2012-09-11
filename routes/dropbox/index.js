var path = require('path')
  , request = require('request')
  , qs = require('querystring')
  
var Dropbox = require( path.resolve(__dirname, '..', '..', 'plugins/dropbox/dropbox.js') ).Dropbox

exports.dropbox = function(req, res){
  
  if(req.query.error === 'true'){
    return res.render('error', {type: 'dropbox', title: 'PhotoPipe - Error!'})
  }
  
  if(!req.session.dropbox || !req.session.dropbox.sync){
  /*  
    return Dropbox.getNewRequestToken(function(err,body){

      if(err){
        return res.render('error',{
            type: 'dropbox', 
            title: 'PhotoPipe - Error!',
            db_error: err
          }) // end res.render
      }

      var q = qs.parse(body)
      
      var auth_url = Dropbox.config.auth_url + "?oauth_token=" + q.oauth_token + "&oauth_callback="+ Dropbox.config.callback_url

      console.log(auth_url + " is the auth_url for dropbox.")      
      
      // Create dropbox session object and stash for later.
      req.session.dropbox = {}
      req.session.dropbox.sync = false
      req.session.dropbox.oauth = {
        request_token: null,
        request_token_secret: q.oauth_token_secret,
        access_token_secret: null,
        access_token: null
      }
      
      res.render('dropbox',{
          title: 'PhotoPipe - Dropbox Connect',
          auth_url: auth_url
        })

    }) // end generateAuthUrl())
*/
      // We need to generate the authUrl and then show the
      // view with the auth_url as a button.
      
      return Dropbox.getNewRequestToken(req,res,function(err,body){

        if(err){
          return res.render('error',{
              type: 'dropbox', 
              title: 'PhotoPipe - Error!',
              db_error: err
            }) // end res.render
        }
        
        console.dir(body)
        
        var auth_url = Dropbox.config.auth_url + "?" + qs.stringify(body) + "&oauth_callback="+ Dropbox.config.callback_url

        console.log(auth_url + " is the auth_url for dropbox")      
        
        // Create dropbox session object and stash for later.
        req.session.dropbox = {}
        req.session.dropbox.sync = false
        req.session.dropbox.oauth = {
          request_token: null,
          request_token_secret: body.oauth_token_secret,
          access_token_secret: null,
          access_token: null
        }
        
        res.render('dropbox',{
            title: 'PhotoPipe - Dropbox Connect',
            auth_url: auth_url
          })

      }) // end generateAuthUrl()

    }
    
  // We are actually auth'd so no reason to be here.
  res.redirect('/')
  
} // end dropbox route

/*
 * GET home timeline with entities page.
 */

exports.search_for_photos = function(req,res){
  
  // https://api.dropbox.com/1/statuses/home_timeline.json?include_entities=true
  
  if(!req.session.dropbox || !req.session.dropbox.sync) return res.redirect('/dropbox')
  
  Dropbox.searchForPhotos(req,res)
  
}

/*
 * GET dropbox oauth page.
 */

exports.dropbox_oauth = function(req,res){
  
  
  // id=409429&oauth_token=15usk7o67ckg644
  if(req.query && req.query.oauth_token){
    
    // Create dropbox session object and stash for later.
    req.session.dropbox.oauth.request_token = req.query.oauth_token
    req.session.dropbox.oauth.access_token_secret = null
    req.session.dropbox.oauth.access_token = null
  
    // We are now fetching the actual access token and stash in
    // session object values in callback.
    Dropbox.getRemoteAccessToken( 
      req.session.dropbox.oauth.request_token, 
      req.session.dropbox.oauth.request_token_secret,
      function(err, data){
        if(err){
          console.error(err)
          res.redirect('/')
        }
        else{
          console.dir(data)
          /***
                { 
                  oauth_token_secret: 't7enjtftcji6esn'
                , oauth_token: 'kqjyvtk6oh5xrc1'
                , uid: '409429' 
                }
          ***/
          req.session.dropbox.oauth.access_token_secret = data.oauth_token_secret,
          req.session.dropbox.oauth.access_token = data.oauth_token
          req.session.dropbox.uid = data.uid
          req.session.dropbox.sync = true
          
          // Check to see it works by fetching account info
          Dropbox.getAccountInfo(req.session.dropbox,function(err,data){
            if(err) return console.error(err)
            console.log('Got account info: ')
            console.dir(data)
          })
        
          // Now go back to home page with session data in tact.
          res.redirect('/')
        
        } // end else in callback
      
    })  // end dbox.getRemoteAccessToken()    
  
  } // end if
  
  // // TODO: Check for error case
  // if(req.query){
  //   console.log('dropbox oauth if req.query....')
  //   console.dir(req.query)
  //   
  //   // For Dropbox, req.query.uid is the user's unique ID for their
  //   // account
  //   /*
  //   oauth_consumer_key:
  //   oauth_token:
  //   The Request Token obtained previously.
  //   */
  //   var oauth_token = req.query.oauth_token
  //   var oauth = 
  //       { consumer_key: Dropbox.config.app_key
  //       , token: Dropbox.config.oauth_token
  //       }
  //     , url = Dropbox.config.access_token_url 
  //     ;
  // 
  // 
  //   console.log('oauth constructed: ')
  //   // console.dir(access_token)
  //   console.dir(oauth)
  // 
  //   request.post({url:url, oauth:oauth, proxy: 'http://127.0.0.1:8888'}, function (e, r, b) {
  //     
  //     if(e) return res.render('error', {
  //                                       type: 'dropbox', 
  //                                       title: 'PhotoPipe - Error!',
  //                                       error: e
  //                             })
  //     
  //     var perm_token = qs.parse(b)
  // 
  //     console.dir(perm_token)
  //     
  //     if(r.statusCode > 399){
  //       console.log(r.statusCode + ' on access token request.')
  //     }
  //     else{
  //       // Create the dropbox session object.
  //       req.session.dropbox = {}
  //       req.session.dropbox.oauth = { consumer_key: Dropbox.config.consumer_key
  //                                   , consumer_secret: Dropbox.config.consumer_secret
  //                                   , token: perm_token.oauth_token
  //                                   , token_secret: perm_token.oauth_token_secret
  //                                   }
  // 
  //       console.dir(req.session.dropbox)
  //     }
  // 
  //     
  // 
  //     return res.redirect('/')                         
  // 
  //   }) // end request.post()
  //   
  // }
  else{
    
    // Handle deny auth case
    
    return res.render('error', {
      type: 'dropbox', 
      title: 'PhotoPipe - Error!',
      error:{
          error_reason: 'denied',
          error_description: 'Looks like you denied us from accessing your dropbox account. :('
        } 
      }) // end res.render
      
  } // end else if
  
} // end dropbox_oauth handler