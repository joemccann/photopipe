/****************************************************************

Facebook....

****************************************************************/

var path = require('path')
  , request = require('request')
  , qs = require('querystring')
  
var Facebook = require(path.resolve(__dirname, '..', '..', 'plugins/facebook/facebook.js')).Facebook

/*
 * GET facebook oauth page.
 */

exports.facebook = function(req, res){
  
  if(req.query.error === 'true'){
    return res.render('error', {type: 'facebook', title: 'PhotoPipe - Error!'})
  }

  if(!req.session.facebook){
    
    // You may want to modify the scope here, but what is listed
    // below is required for PhotoPipe

    res.render('facebook', {
      title: 'PhotoPipe - Facebook OAuth',
      auth_url: 'https://www.facebook.com/dialog/oauth?client_id='+Facebook.config.client_id
                +'&redirect_uri='+Facebook.config.redirect_uri
                +'&scope=user_photos,photo_upload,publish_stream'
                +'&state='+new Date
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

/*
 * GET facebook photo album cover via cover photo ID.
 * 
 * 'cover_photo' param required
 * returns a string, does not render a page.
 */
 
exports.facebook_get_photo_album_cover = function(req,res){
  
  if(!req.session.facebook || !req.session.facebook.access_token) return res.redirect('/facebook')
  
  var coverImgId = req.query.cover_photo

  request.get('https://graph.facebook.com/'+coverImgId
              +'?access_token='+req.session.facebook.access_token, function(e,r,b){
    
    if(e){
      res.type('text/plain')
      return res.send('/img/pipe-75x75.png')
    }
    
    var fbImagesJson = JSON.parse(b)

    var theImg = fbImagesJson.picture || fbImagesJson.source // source is larger size

    if(!theImg){
      res.type('text/plain')
      return res.send('/img/pipe-75x75.png')
    }

    res.type('text/plain') 
    return res.send(theImg)
    
  }) // request.get(fb-album-cover)
  
}

/*
 * GET facebook photos from an album's ID.
 * 
 * 'id' param required
 * returns a JSON, does not render a page.
 */

exports.facebook_get_photos_from_album_id = function(req,res){
  
  if(!req.session.facebook || !req.session.facebook.access_token) return res.redirect('/facebook')
  
  var galleryId = req.query.id
  
  if(!galleryId){
    res.type('text/plain')
    return res.status('404').send("No album ID present in request.")
  }

  request.get('https://graph.facebook.com/'
              +galleryId+'/photos?access_token='+req.session.facebook.access_token, function(e,r,b){
    
    if(e){
      res.type('text/plain')
      return res.status('404').send(e)
    }
    
    var fbImagesJson = JSON.parse(b)

    if(!fbImagesJson.data){
      return res.json({message: "Unable to grab photos for gallery."})
    }

    return res.json(fbImagesJson)
    
  }) // request.get(fb-album-cover)
  
}

/*
 * GET facebook user's albums.
 * 
 * returns a JSON, does not render a page.
 */
 
exports.facebook_get_photo_albums = function(req,res){
  
  if(!req.session.facebook || !req.session.facebook.access_token) return res.redirect('/facebook')
  
  Facebook.getFbPhotoAlbums(req,res)
              
} // end facebook_get_photo_albums handler

/*
 * GET facebook photos a user is tagged in.
 * 
 * returns a JSON, does not render a page.
 */
 
exports.facebook_get_tagged_in_photos = function(req,res){
  
  if(!req.session.facebook || !req.session.facebook.access_token) return res.redirect('/facebook')
  
  // Fetch user's photos, NOT their albums (so these are typically photos they are tagged in)
  
  request.get('https://graph.facebook.com/me/photos?access_token='
              +req.session.facebook.access_token, function(e,r,b){
                
                if(e) {
                  res.type('text/plain')
                  return res.status('404').send(e)
                }

                var fbImagesJson = JSON.parse(b)

                return res.json(fbImagesJson.data)
                
              }) // request.get(fb-tagged-photos)
  
} // end facebook_get_tagged_in_photos handler

/*
 * GET facebook oauth page.
 */

exports.facebook_oauth = function(req,res){
  
  // https://developers.facebook.com/docs/authentication/server-side/
  
  if(req.query && req.query.code){
    
    // Handle initial code response
    
    var code = req.query.code
    
    request.get('https://graph.facebook.com/oauth/access_token?client_id='+Facebook.config.client_id
       +'&redirect_uri=http://photopi.pe/oauth/facebook'
       +'&client_secret='+Facebook.config.client_secret
       +'&code='+code, function(e,r,b){
         if(e) return res.send(e)
         
         var parseQs = qs.parse(b)
         
         req.session.facebook = {
           access_token: parseQs.access_token,
           expires: parseQs.expires
         }
         res.redirect('/facebook')
       })
    
  }
  else if(req.query && req.query.error){
    
    // Handle deny auth case
    
    return res.render('error', {
      type: 'facebook', 
      title: 'PhotoPipe - Error!',
      fb_error:{
          error_reason: req.query.error_reason,
          error: req.query.error,
          error_description: req.query.error_description
        } 
      }) // end res.render
      
  } // end else if
  
} // end facebook_oauth handler