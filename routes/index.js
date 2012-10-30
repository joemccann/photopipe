var path = require('path')
  , request = require('request')
  , fs = require('fs')
  , qs = require('querystring')
  , validator = require( path.resolve(__dirname, '..', 'utils/validation.js') ) 
  , db_client = require( path.resolve(__dirname, '..', 'database/redis-client.js') )
  , redis = require('redis')
  , _ = require('lodash')
  , Validator = require('validator').Validator
  , validator = null


/****************************************************************

Account Management Module

****************************************************************/
var Account = (function(){
  
  // Constructor...
  !function(){
    
    // Extend the validator object's prototype to capture all errors
    // and then provide a method to get the array of them
    
    Validator.prototype.error = function (msg) {
        this._errors.push(msg)
        return this
    }

    Validator.prototype.getErrors = function () {
        return this._errors
    }

    validator = new Validator()

  }()
  
  return{
    reservedUsernames: /wtf|account|smoke|not-implemented|dropbox|twitter|instagram|facebook|evernote|500px|flickr|bazaarvoice|box|google-drive/i,
    renderLoginError: function(req,res, message, view, extras){

      // Our view may require view specific variables so we merge them here.
      var config = _.merge(extras || {}, {hasErrors: true, error_message: message})
      
      return res.render(view, config )
    },
    createAccount: function(email_address, password, cb){
      // emails is setname; user is the hashPrefix
      db_client.createUserIdentityAccount(email_address, password, 'emails', 'user', function(err,data){
        cb && cb(err,data)
      })
    },
    attachUsernameToAccount: function(email_address, username, cb){
      // usernames is setname; user is the hashPrefix
      db_client.addUsernameToAccount(email_address, username, 'usernames', 'user', cb)
    },
    verifyPassword: function(email_address, password, cb){
      db_client.verifyPassword(email_address,password, 'user', cb)
    },
    doesAccountExist: function(setname, email_address, cb){
      db_client.doesAccountExist(setname, email_address, cb)
    },
    doesUsernameExist: function(setname, username, cb){
      db_client.doesUsernameExist(setname, username, cb)
    },
    incrementPipedCount: function(){
      db_client.getClient().incr( "totalPipedPhotos" , redis.print)
    },
    renderDashboard: function(req,res,email_address){

      // Get the username
      db_client.getUsername(email_address, 'user', function(err,username){

        req.session.username = username
        req.session.email_address = email_address

        return res.redirect('/'+username)
        
      }) // end getUsername()
      
    }
  }
  
})()


/****************************************************************

Actual Routes...

****************************************************************/

/*
 * GET home page.
 */

exports.index = function(req, res){
  
  if(req.session.username && req.session.email_address) return res.redirect('/'+req.session.username)
  
  if(req.query.error){
    return res.render('error', {
      type: req.query.type
    })
  }
  
  return res.render('home')

  // res.render('index')
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
        
        Account.incrementPipedCount()
        
      }else if(echo.type === 'twitter'){

        var twit = require(path.resolve(__dirname, '..', 'plugins/twitter/twitter.js')).Twitter

        // Now, just pipe the echo object and be sure to pass the
        // request and response objects as well.
        twit.pipeToTwitter(echo, req, res)
        
        Account.incrementPipedCount()
      }else if(echo.type === 'dropbox'){

        var dropbox = require(path.resolve(__dirname, '..', 'plugins/dropbox/dropbox.js')).Dropbox

        // Now, just pipe the echo object and be sure to pass the
        // request and response objects as well.
        dropbox.pipeToDropbox(echo, req, res)
        
        Account.incrementPipedCount()
        
      }else if(echo.type === 'bazaarvoice'){

        var bv = require(path.resolve(__dirname, '..', 'plugins/bazaarvoice/bv.js'))

        // Now, just pipe the echo object and be sure to pass the
        // response object as well.
        bv.pipeToBv(echo, res)
        
        Account.incrementPipedCount()
        
      }else if(echo.type === 'echo' || echo.type === 'download'){
        
        res.json(echo)
        
        if(echo.type === 'download') Account.incrementPipedCount()
        
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

  var email_address = req.body['email_address']
    , password = req.body['password']

  console.log(email_address + " is the incoming email address.")

  // VALIDATE EMAIL ADDRESS
  validator.check(email_address, "That's not a valid email address.").isEmail()  
  // VALIDATE PASSWORD
  validator.check(password, "Your password must be at least 8 characters long.").notEmpty().len(8,128)

  // If we have errors...
  if( validator.getErrors().length ){
    // Right now we just grab the first one because we're lazy
    console.error("Error: " + validator.getErrors()[0])
    return res.render('home', {hasErrors: true, error_message: validator.getErrors()[0] })
  }
  
  // Check if the account already exists, meaning, they are logging in
  Account.doesAccountExist('emails', email_address, function(err,data){
    if(err) return console.error(err)

    console.log('Does account exist? ' + (data === 0 ? 'no' : 'yes') )
    
    // If it is 1 then we have it in the set, meaning, it is already created
    if(data === 1){
      
      Account.verifyPassword(email_address, password, function(err,isMatch){
        
        if(err) return console.error(err)
        
        if( !isMatch ) {
          console.log('Password auth was not successful.')
          return Account.renderLoginError( req,res, "That password is invalid.", "home")
        }

        // Otherwise, all is fine and we are logged in so send them to the dashboard.
        console.log('Password auth was successful.')
        return Account.renderDashboard(req,res,email_address)
        
      }) // end verifyPassword()
      
    }

    // Otherwise, it is 0 meaning it does not exist.
    if(data === 0){

      Account.createAccount(email_address, password, function(err,data){
        // Now, send them to the page to pick their username
        if(err) return console.error(err)

        console.dir(data)

        res.redirect('/account/username?email_address='+email_address)    

      }) // end createAccount
      
    }

  }) // end doesAccountExist()

}

/*
 * GET account logout route.
 */
 
exports.account_logout = function(req,res){

  req.session = null

  res.redirect('/')

}

/*
 * GET create username
 */

exports.account_username = function(req,res,next){
  
  var config = {
    hasErrors: false,
    account_email_address: req.query.email_address
  }
  
  if(!config.account_email_address) return next()
  
  res.render('account_username', config)
  
}


/*
 * POST create username
 */
 
exports.account_username_post = function(req,res,next){

  // TODO: CHECK TO SEE IF THE USERNAME EXISTS
  var email_address = req.body['email_address']
    , username = req.body['username']

  console.log(username + " is the incoming username")

  // VALIDATE EMAIL ADDRESS
  validator.check(email_address, "That's not a valid email address.").isEmail()  
  // VALIDATE USERNAME
  validator.check(username, "Sorry, that username is taken.").not(Account.reservedUsernames)
  validator.check(username, "Your username must be at least one character long.").notEmpty().len(1,128)
  // If we have errors...
  if( validator.getErrors().length ){
    // Right now we just grab the first one because we're lazy
    console.error("Error: " + validator.getErrors()[0])
    return res.render('account_username', {hasErrors: true, error_message: validator.getErrors()[0], account_email_address: email_address })
  }
  
  // Check to see if username exists
  Account.doesUsernameExist('usernames', username, function(err,data){

    console.log('Does username exist? ' + (data === 0 ? 'no' : 'yes') )

    // If it is 1 then we have it in the set, meaning, it is already claimed
    if(data === 1){
      
      return Account.renderLoginError(
          req,
          res, 
          "That username is already taken.", "account_username", 
          {
            account_email_address: email_address
          }
        ) // end renderLoginError()
      
    }

    // Otherwise, it is 0 meaning it does not exist.
    if(data === 0){
    
      Account.attachUsernameToAccount(email_address, username, function(err,data){
        // Now, send them to the page to pick their username
        if(err) return console.error(err)

        if(data === 0) return Account.renderLoginError(
            req,
            res, 
            "You already have a username.", 
            "account_username", 
            {
              account_email_address: email_address
            }
          ) // end renderLoginError

        // When data returns 0, it means the username already exists in Redis
        db_client.getClient().sismember(username, function(e,d){

          if(err) return console.error(err)

          if(data === 0) return Account.renderLoginError(
              req,
              res, 
              "That username is taken.", 
              "account_username",
              {
                account_email_address: email_address
              }
            ) // end renderLoginError

          console.log('Good username!')

          // REDIRECT TO DASHBOARD
          return Account.renderDashboard(req,res,email_address)

        }) // end sget()

      }) // end attachUsernameToAccount()
      
    }

  }) // end doesUsernameExist()
  
  
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
 * GET user dashboard page
 */

exports.user_dashboard = function(req,res,next){
  
  // CHECK IF WE ARE LOGGED IN, IF NOT, GO TO LOGIN PAGE.
  if( !(req.session.username && req.session.email_address ) ){
    return res.redirect('/')
  }
  
  var config = {
    hasErrors: false,
    username: req.session.username,
    email_address: req.session.email_address
  }
  
  return res.render('user_dashboard', config)
  
}


/*
 * GET not implemented page.
 */

exports['not-implemented'] = function(req, res){
  
  res.render('not-implemented')
}