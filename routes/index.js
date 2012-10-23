var path = require('path')
  , request = require('request')
  , fs = require('fs')
  , qs = require('querystring')
  , validator = require( path.resolve(__dirname, '..', 'utils/validation.js') ) 
  , db_client = require( path.resolve(__dirname, '..', 'database/redis-client.js') )
  , redis = require('redis')


/****************************************************************

Account Management Module

****************************************************************/
var Account = (function(){
  
  return{
    loginUser: function(email,password){
      
    }
  }
  
})()

  

/****************************************************************

Util methods...

****************************************************************/

function incrementPipedCount(){
  db_client.getClient().incr( "totalPipedPhotos" , redis.print)
}

function emailHashStore(email,isExistent){

  this._hash = this._hash || {}
  
  if(isExistent){
    return !!(this._hash[email])
  }
  return this._hash[email] = true
  
  
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
  
  return res.render('home')

  res.render('index')
}

/*
 * GET login/create account page.
 */

exports.login = function(req, res, next){
  
  var config = {
    hasErrors: false
  }
  // REMOVE THIS WHEN YOU SORT OUT THE ACCOUNT STUFF
  // return res.redirect('/instagram/search')
  
  res.render('account_login', config)
}

/*
 * GET wtf (about) page.
 */

exports.wtf = function(req, res, next){
  
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
  if(!req.body.photoUrl) {
    return res.status(403).send("No photo URL in yer POST, brah.")
  }
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
  echo.photoName = req.body.filename || 
                    validator.getImageNameWithoutQueryStringOrHash( path.basename(req.body.photoUrl) ) 
                    || new Buffer( ( new Date().toString() ) ).toString('base64') +'.jpg' // this is a guess and will probably break
  
  // Verify it's a mufckn image (png, jpg, etc.)
  // TODO: CHECK FOR MIME TYPE? -- we need to do this after it is fetched via request
  // because some images may require redirects, like Instagram
  // if( !(/\.(?=gif|jpg|jpeg|png|bmp)/gi).test(echo.photoName) ){
  //   echo.message = "Looks like the url "+echo.photoUrl+" is not an image, breaux."
  //   return res.status(403).send(echo.message)
  // }
  
  echo.fullPhotoPath = path.join(echo.photoDirPath, echo.photoName)
  
  // http://bit.ly/node-createWriteStream 
  var ws = fs.createWriteStream( echo.fullPhotoPath ) 
  
  console.log(echo.photoUrl + " is the photoUrl")
  console.log(echo.photoName + " is the photoName")

  // Let's put the shit in our pipe and smoke it! Err, write it to a file.
  request(echo.photoUrl).pipe( ws )

  // http://bit.ly/node-stream-on-error
  ws.on('error', function(exception){
    echo.message = exception
    return res.status(403).send(echo.message)
  }) // end ws.error()  

  // http://bit.ly/node-stream-on-close
  ws.on('close', function(){
    // Check to see it was written.
    fs.exists(echo.fullPhotoPath, function (exists) {

      if(!exists){
        echo.errorMessage = "Unable to verify your photo " + echo.photoName + " was written to disk, brochacho."
        return res.status(403).send(echo.message)
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
      }else if(echo.type === 'dropbox'){

        var dropbox = require(path.resolve(__dirname, '..', 'plugins/dropbox/dropbox.js')).Dropbox

        // Now, just pipe the echo object and be sure to pass the
        // request and response objects as well.
        dropbox.pipeToDropbox(echo, req, res)
        
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
 * POST account login.
 */

exports.account_login = function(req,res){

  var email_address = req.body['login-email-address']
    , password = req.body['login-password']

  // TODO: VALIDATE EMAIL ADDRESS
  if(!email_address || !'change-this-to-a-validator'){
    return res.render('home', {hasErrors: true, error_message: "That's an invalid email address."})
  }
  
  // TODO: VALIDATE PASSWORD
  if(!password || !'change-this-to-a-validator'){
    return res.render('home', {hasErrors: true, error_message: "That's an invalid password."})
  }
  
  // TODO: CHECK TO SEE IF EMAIL EXISTS
  if( emailHashStore(email_address, true) ){
    // Try to login
    console.log('Email exists in hash')
    res.send('exists')
  }  
  else{
    // Otherwise, store it in the hash (maybe after we add the account?)
    emailHashStore(email_address)
    res.redirect('/:username')
  }

}

/*
 * GET forgot account page
 */

exports.account_forgot = function(req,res,next){
  
  var config = {
    hasErrors: false
  }
  
  res.render('account_forgot', config)
  
}


/*
 * POST forgot account page
 */
 
exports.account_forgot_find = function(req,res,next){
  
  res.render('not-implemented')
  
}


/*
 * GET forgot account page
 */

exports.user_dashboard = function(req,res,next){
  
  var config = {
    hasErrors: false,
    username: req.params.username
  }
  
  // TODO: LOOK UP USER AND GET THEIR INFO
  
  return res.render('not-implemented')
  
  res.render('user_dashboard', config)
  
}


/*
 * GET not implemented page.
 */

exports['not-implemented'] = function(req, res){
  
  res.render('not-implemented')
}