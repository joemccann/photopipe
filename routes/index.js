var path = require('path')
  , request = require('request')
  , fs = require('fs')

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'PhotoPipe - Put Your Image URL In and Smoke It!' });
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
      res.json(echo)
      
      /******************** PUT PLUGIN HOOKS BELOW HERE **********************/
      
      // For example, to pipe to Bazaarvoice, include it from plugins directory
      // var bv = require(path.resolve(__dirname, '..', 'plugins/bazaarvoice/bv.js'))
      
      // Now, just pipe the echo object and be sure to pass the
      // response object as well.
      // bv.pipeToBv(echo, res)

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