/****************************************************************

Instagram....

****************************************************************/

var path = require('path')
var Instagram = require(path.resolve(__dirname, '..', '..', 'plugins/instagram/instagram.js')).Instagram

/*
 * GET instagram page.
 */

exports.instagram = function(req, res){
  
  if(req.query.error === 'true'){
    return res.render('error', {type: 'instagram', title: 'PhotoPipe - Error!'})
  }
  
  if(!req.session.instagram){
    
    // Protip: Use a space when specifying various scope descriptors
    var auth_url = Instagram.oauth.authorization_url({
      scope: 'basic', 
      display: 'touch'
    })

    res.render('instagram', { 
        title: 'PhotoPipe - Instagram OAuth'
      , auth_url: auth_url})
    
  }
  else{

    // Let's grab the user's recent photos from their feed.
    Instagram.set('access_token', req.session.instagram.access_token)

    Instagram.users.recent({ 
      user_id: req.session.instagram.user.id, 
      complete: function(data){
        
        // TODO: ADD PAGINATION
        
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

  } // end else

} // end instagram route

/*
 * GET instagram oauth page.
 */

exports.instagram_oauth = function(req,res){
  
  Instagram.oauth.ask_for_access_token({
      request: req,
      response: res,
      complete: function(params, response){
        
        // Set the JSON object response to the _user object
        // for access later...
        req.session.instagram = params
        
        // Head back to instagram page, but this time, we'll enter
        // the else block because we have an Instagram._user object
        return res.redirect('/instagram')

      },
      error: function(errorMessage, errorObject, caller, response){
        // errorMessage is the raised error message
        // errorObject is either the object that caused the issue, or the nearest neighbor
        res.redirect('/instagram?error=true')
      }
    })
    return null
}
