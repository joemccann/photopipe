var path = require('path')
  , request = require('request')
  , fs = require('fs')

/****************************************************************

Plugins...

****************************************************************/

var Instagram = require(path.resolve(__dirname, '..', 'plugins/instagram/instagram.js')).Instagram


/****************************************************************

Actual Routes...

****************************************************************/

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'PhotoPipe - Put Your Image URL In and Smoke It!'})
}

/*
 * POST inbound photo url.

  -- API Interface --
  Post body can/should contain:

  photoUrl (required)     An URL to an image
  timeToDie (optional)    A numerical value in seconds of how long the image remains on disk.
  
*/
 
exports.smoke = function(req, res){
  // Check for a mufkcn photo url...
  if(!req.body.photoUrl) return res.json({error: true, message: "No photo URL in yer POST, brah."})

  // Echo back all the things.
  var echo = {}
  
  // http://bit.ly/node-path-resolve
  // http://bit.ly/node-path-join
  echo.photoDirPath = path.resolve(__dirname, '..', path.join('public','outbound'))
  echo.photoUrl = req.body.photoUrl

  // http://bit.ly/node-path-basename
  echo.photoName = path.basename(req.body.photoUrl)
    
  // Verify it's a mufckn image (png, jpg, etc.)
  if( !(/\.(?=gif|jpg|jpeg|png|bmp)/gi).test(echo.photoName) ){
    echo.hasError = true
    echo.message = "Looks like the url "+echo.photoUrl+" is not an image, breaux."
    return res.json(echo)
  }
  
  echo.fullPhotoPath = path.join(echo.photoDirPath, echo.photoName)
  
  // http://bit.ly/node-createWriteStream 
  var ws = fs.createWriteStream( echo.fullPhotoPath ) 

  // Let's put the shit in our pipe and smoke it! Err, write it to a file.
  request(echo.photoUrl).pipe( ws )

  // http://bit.ly/node-stream-on-error
  ws.on('error', function(exception){
    echo.hasError = true
    echo.errorMessage = exception
    return res.json(echo)
  }) // end ws.error()  

  // http://bit.ly/node-stream-on-close
  ws.on('close', function(){
    // Check to see it was written.
    fs.exists(echo.fullPhotoPath, function (exists) {
      
      if(!exists){
        echo.hasError = true
        echo.errorMessage = "Unable to verify your photo " + echo.photoName + " was written to disk, brochacho."
      }
      // So now we just echo it back. Ideally you want to redirect
      // it to another service...see below.
      // res.json(echo)
      
      /******************** PUT PLUGIN HOOKS BELOW HERE **********************/
      
      // For example, to pipe to Bazaarvoice, include it from plugins directory
      var bv = require(path.resolve(__dirname, '..', 'plugins/bazaarvoice/bv.js'))
      
      // Now, just pipe the echo object and be sure to pass the
      // response object as well.
      bv.pipeToBv(echo, res)

      // IMPORTANT: Since we are passing the 'res' object here, you need
      // to comment it out or remove it above (the res.json(echo) line).


      /******************** PUT PLUGIN HOOKS ABOVE HERE **********************/

      
    }) // end fs.exists
    
  }) // end ws.close()  

  // If request wants to delete then...
  if(req.body.timeToDie){
  
    setTimeout( function(){
      fs.unlink( echo.fullPhotoPath )
    }, parseInt(req.body.timeToDie)*1000 )
  
  } // end if timeToDie
  
} // end inbound route


/*
 * GET instagram page.
 */

exports.instagram = function(req, res){
  
  if(req.query.error === 'true'){
    return res.render('error', {type: 'instagram', title: 'PhotoPipe - Error!'})
  }
  
  if(!Instagram._user){

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
    Instagram.users.recent({ 
      user_id: Instagram._user.user.id, 
      complete: function(data){
        
        // TODO: ADD PAGINATION
        
        res.render('instagram-user', { 
            title: 'PhotoPipe - Hello '+ Instagram._user.user.username,
            username: Instagram._user.user.username,
            media: JSON.stringify(data)
          })
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
        Instagram._user = params
        // Stash the access_token for signed requests later...
        Instagram.set('access_token', Instagram._user.access_token)
        
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
