var path = require('path')
  , request = require('request')
  , fs = require('fs')
  , qs = require('querystring')
  , validator = require( path.resolve(__dirname, '..', 'utils/validation.js') ) 
  , db_client = require( path.resolve(__dirname, '..', 'database/redis-client.js') )
  , redis = require('redis')
  

/****************************************************************

Util methods...

****************************************************************/

function incrementPipedCount(){
  db_client.getClient().incr( "totalPipedPhotos" , redis.print)
}


/****************************************************************

Actual Routes...

****************************************************************/

/*
 * GET home page.
 */

exports.index = function(req, res){
  
  if(req.query.error){
    return res.render('error', {
      type: req.query.type
    })
  }
  
  // Some flags to be set for client-side logic.
  var auths = {
    isTwitterAuth: !!req.session.twitter,
    isFacebookAuth: !!req.session.facebook,
    isInstagramAuth: !!req.session.instagram,
    isDropboxAuth: !!req.session.dropbox
  }
  
  res.render('index', auths)
}

/*
 * GET wtf (about) page.
 */

exports.wtf = function(req, res){
  
  res.render('wtf', {
    title: 'PhotoPipe is a way to take photos from one social network and post them to another.',
    description: 'PhotoPipe is a way to take photos from one social network and post them to another.'})
}

/*
 * POST inbound photo url.

  -- API Interface --
  Post body can/should contain:

  photoUrl (required)     An URL to an image
  timeToDie (optional)    A numerical value in seconds of how long the image remains on disk.
  
*/
 
exports.smoke = function(req, res){

  console.log('\n\nSmoking my pipe...\n\n')

  // Check for a mufkcn photo url...
  if(!req.body.photoUrl) return res.json({error: true, message: "No photo URL in yer POST, brah."})
  
  // Echo back all the things.
  var echo = {}
  
  // http://bit.ly/node-path-resolve
  // http://bit.ly/node-path-join
  echo.photoDirPath = path.resolve(__dirname, '..', path.join('public','outbound'))
  echo.photoUrl = req.body.photoUrl
  echo.caption = req.body.caption || ''
  echo.type = req.body.type || 'echo'   

  // http://bit.ly/node-path-basename
  // Also, clean it up a bit
  echo.photoName = validator.getImageNameWithoutQueryStringOrHash( path.basename(req.body.photoUrl) )
    
  // Verify it's a mufckn image (png, jpg, etc.)
  // TODO: CHECK FOR MIME TYPE?
  if( !(/\.(?=gif|jpg|jpeg|png|bmp)/gi).test(echo.photoName) ){
    echo.hasError = true
    echo.message = "Looks like the url "+echo.photoUrl+" is not an image, breaux."
    return res.json(echo)
  }
  
  echo.fullPhotoPath = path.join(echo.photoDirPath, echo.photoName)
  
  // console.dir(echo)
  
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
      
      /******************** PUT PLUGIN HOOKS BELOW HERE **********************/
      
      if(echo.type === 'facebook'){
        // TODO: Not sure if this check goes here or in pipePhotoToFb() in facebook.js plugin 
        if(!req.session.facebook || !req.session.facebook.access_token){
          res.type('text/plain')
          return res.status(403).send("You are not authenticated with Facebook.")
        } 

        var fb = require(path.resolve(__dirname, '..', 'plugins/facebook/facebook.js')).Facebook

        fb.pipePhotoToFb(echo, req, res)
        
        incrementPipedCount()
        
      }else if(echo.type === 'twitter'){

        var twit = require(path.resolve(__dirname, '..', 'plugins/twitter/twitter.js')).Twitter

        // Now, just pipe the echo object and be sure to pass the
        // request and response objects as well.
        twit.pipeToTwitter(echo, req, res)
        
        incrementPipedCount()
        
      }else if(echo.type === 'bazaarvoice'){

        var bv = require(path.resolve(__dirname, '..', 'plugins/bazaarvoice/bv.js'))

        // Now, just pipe the echo object and be sure to pass the
        // response object as well.
        bv.pipeToBv(echo, res)
        
        incrementPipedCount()
        
      }else if(echo.type === 'echo' || echo.type === 'download'){
        res.json(echo)
        
        if(echo.type === 'download') incrementPipedCount()
        
      }

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
 * GET download file.
 */

exports.download_file = function(req,res){

  var filePath = req.query.filePath
    , fileName = req.query.fileName || "photopipe_download"
    
  var fileExtension = (/\.(gif|jpg|jpeg|png|bmp)/gi.exec(filePath))[0]

  fileName += fileExtension
  
  res.download(filePath, fileName, function(err){
    if(err) {
      console.error(err)
      res.status(err.status).send(err.code) 
    }
    else{

      // Delete the file after download
      setTimeout(function(){

        fs.unlink(filePath, function(err, data){
          if(err) return console.error(err)
          console.log(filePath + " was unlinked")

        },15000) // end unlink

      }) // end nextTick

    } // end else

  })

}

/*
 * GET not implemented page.
 */

exports['not-implemented'] = function(req, res){
  
  res.render('not-implemented')
}