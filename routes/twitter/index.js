var path = require('path')
  , request = require('request')
  , qs = require('querystring')
  
var Facebook = require(path.resolve(__dirname, '..', '..', 'plugins/twitter/twitter.js')).Twitter


exports.twitter = function(req, res){
  
  if(req.query.error === 'true'){
    return res.render('error', {type: 'twitter', title: 'PhotoPipe - Error!'})
  }

  if(!req.session.twitter){
    
    // You may want to modify the scope here, but what is listed
    // below is required for PhotoPipe

    res.render('twitter', {
      title: 'PhotoPipe - Twitter OAuth',
      auth_url: "/not-implemented"
    })

  }
  else{
    
    // console.log('Access Token: %s', req.session.facebook.access_token)

    // Fetch profile from graph API
    request.get('https://graph.facebook.com/me?access_token='+req.session.facebook.access_token, function(e,r,b){

      if(e) return res.render('error', {type: 'facebook', title: 'PhotoPipe - Error!'})
      
      var fbJson = JSON.parse(b)
      
      // console.dir(fbJson)

      req.session.facebook.username = fbJson.username
      req.session.facebook.name = fbJson.name
      req.session.facebook.id = fbJson.id
      
      // Get the photo albums
      Facebook.getFbPhotoAlbums(req,res,function(err,data){
        
        if(err){
          return res.render('error',{
              type: 'facebook', 
              title: 'PhotoPipe - Error!',
              fb_error: err
            }) // end res.render
        }
        
        res.render('facebook-user', { 
            title: 'PhotoPipe - Hello '+ req.session.facebook.name,
            username: req.session.facebook.name,
            media: JSON.stringify(data)
          })
        
        
      }) // end getFbPhotoAlbums

    }) // end request.get(fb-me)

   } // end else
  
} // end facebook route
