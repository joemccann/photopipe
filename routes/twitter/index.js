var path = require('path')
  , request = require('request')
  , qs = require('querystring')
  
var Twitter = require(path.resolve(__dirname, '..', '..', 'plugins/twitter/twitter.js')).Twitter


exports.twitter = function(req, res){
  
  if(req.query.error === 'true'){
    return res.render('error', {type: 'twitter', title: 'PhotoPipe - Error!'})
  }
  
  if(!req.session.twitter){
    
    // We need to generate the authUrl and then show the
    // view with the auth_url as a button.
    return Twitter.generateAuthUrl(req,res,function(err,body){

      if(err){
        return res.render('error',{
            type: 'twitter', 
            title: 'PhotoPipe - Error!',
            fb_error: err
          }) // end res.render
      }
      
      res.render('twitter',{
          title: 'PhotoPipe - Twitter Connect',
          auth_url: body
        })
      
    }) // end generateAuthUrl()
    
  }
  
  // We are actually auth'd so no reason to be here.
  res.redirect('/')
  
} // end twitter route

/*
 * GET home timeline with entities page.
 */

exports.twitter_get_media_timeline = function(req,res){
  
  // https://api.twitter.com/1/statuses/home_timeline.json?include_entities=true
  
  if(!req.session.twitter || !req.session.twitter.oauth) return res.redirect('/twitter')
  
  Twitter.getMediaTimeline(req,res)
  
}

/*
 * GET twitter oauth page.
 */

exports.twitter_oauth = function(req,res){
  
  // TODO: Check for error case
  if(req.query && !req.query.denied){
    
    // console.dir(req.query)

    var access_token = req.query
      , oauth = 
        { consumer_key: Twitter.config.consumer_key
        , consumer_secret: Twitter.config.consumer_secret
        , token: access_token.oauth_token
        , verifier: access_token.oauth_verifier
        }
      , url = Twitter.config.access_token_URL_https 
      ;
      
    // console.dir(access_token)

    request.post({url:url, oauth:oauth}, function (e, r, b) {
      
      if(e) return res.render('error', {
                                        type: 'twitter', 
                                        title: 'PhotoPipe - Error!',
                                        error: e
                              })
      
      var perm_token = qs.parse(b)

      console.dir(perm_token)

      
      // Create the twitter session object.
      req.session.twitter = {}
      req.session.twitter.oauth = { consumer_key: Twitter.config.consumer_key
                                  , consumer_secret: Twitter.config.consumer_secret
                                  , token: perm_token.oauth_token
                                  , token_secret: perm_token.oauth_token_secret
                                  }
                                  
      // Now, let's create the user's account in redis
      var userObj = {
        
      }
      console.dir(req.session.twitter)

      return res.redirect('/')                         

    }) // end request.post()
    
  }
  else if(req.query && req.query.denied){
    
    // Handle deny auth case
    
    return res.render('error', {
      type: 'twitter', 
      title: 'PhotoPipe - Error!',
      error:{
          error_reason: 'denied',
          error_description: 'Looks like you denied us from accessing your twitter account. :('
        } 
      }) // end res.render
      
  } // end else if
  
} // end twitter_oauth handler