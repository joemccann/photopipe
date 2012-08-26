var fs = require('fs')
  , path = require('path')

var instagram_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'instagram-config.json'), 'utf-8' ) )

var Instagram = require('instagram-node-lib')

Instagram.set('client_id', instagram_config.client_id)
Instagram.set('client_secret', instagram_config.client_secret)
Instagram.set('redirect_uri', instagram_config.redirect_uri)

// to be set later after auth...
Instagram._user = null

Instagram.photopipe = {
  getUserRecentPhotos: function(req,res){
    // Let's grab the user's recent photos from their feed.
    Instagram.set('access_token', req.session.instagram.access_token)

    Instagram.users.recent({ 
      user_id: req.session.instagram.user.id,
      error: function(errorMessage, errorObject, caller, response){
       var err = JSON.parse(errorObject)
       return res.status(err.meta.code).send(err.error_message)
      },
      complete: function(data){

        // TODO: ADD PAGINATION
        return res.json(data)
        
        res.render('instagram-user', { 
            title: 'PhotoPipe - Hello '+ req.session.instagram.user.username,
            username: req.session.instagram.user.username,
            media: JSON.stringify(data)
          })
          
          // unset access_token --> 
          // this is probably pretty bad in practice actually (race conditions)
          Instagram.set('access_token', null)
          
      } // end complete 
    
    }) // end recent
    
  }
}

exports.Instagram = Instagram