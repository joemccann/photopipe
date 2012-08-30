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

    return res.render('instagram', { 
        title: 'PhotoPipe - Instagram Connect'
      , auth_url: auth_url})
    
  }
  
  // We are actually auth'd so no reason to be here.
  res.redirect('/')

} // end instagram route

exports.instagram_get_user_recent_photos = function(req,res){

  if(!req.session.instagram) return res.redirect('/instagram')

  Instagram.photopipe.getUserRecentPhotos(req,res)
    
}

exports.instagram_get_next_page_user_recent_photos = function(req,res){

  if(!req.session.instagram) return res.redirect('/instagram')

  if(!req.query.next_page_url) {
    res.type('text/plain')
    return res.status(403).send("Bad Request. Missing next_page_url param")
  }
  
  Instagram.photopipe.getNextPageUserRecentPhotos(req,res)
  
}

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
        return res.redirect('/')

      },
      error: function(errorMessage, errorObject, caller, response){
        // errorMessage is the raised error message
        // errorObject is either the object that caused the issue, or the nearest neighbor
        res.redirect('/?error=true&type=instagram') 
      }
    })
    return null
}
