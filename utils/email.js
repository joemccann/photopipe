var nodemailer = require("nodemailer")
  , fs = require('fs')
  , path = require('path')

exports.Email = (function(){

  var email_config
    , smtpTransport

  // Load up the config file from an optional path or hardcoded fallback.
  function _loadConfig(path){
    email_config = JSON.parse( path || (fs.readFileSync( path.resolve(__dirname, 'email-config.json'), 'utf-8' ) ) )
  }
  
  // Create the SMTP transport for later use
  function _createSmtpTransport(){
    // create reusable transport method (opens pool of SMTP connections)
    smtpTransport = nodemailer.createTransport("SMTP",{
        service: "Gmail",
        auth: {
            user: email_config.username,
            pass: email_config.password
        }
    })
    
  }
  
  // Constructor
  !function(){

    // Order is important...
    
    _loadConfig()
    _createSmtpTransport()

  }()

  return {
    loadConfig: _loadConfig,
    sendForgotPasswordEmail: function(fromSender, toRecipient, subject, emailText, emailHtml, cb){
      
      var fromAddress = fromSender "Photopipe Support <no-reply@photopi.pe>"
        , toAddress = toRecipient || "joseph.isaac@gmail.com" // TODO: CHANGE THIS TO TEST@PHOTOPI.PE
        , subject = subject || "Reset Your Photopipe Password"
        , text = emailText || "You need to reset your password, yo!" 
        , html = emailHtml || "<b>You need to reset your password, yo!</b>" 
        
      // setup e-mail data with unicode symbols
      var mailOptions = {
          from: fromAddress, 
          to: toAddress, 
          subject: subject, 
          text: text, 
          html: html 
      }
      
      // send mail with defined transport object
      smtpTransport.sendMail(mailOptions, function(error, response){

          if(error) return cb(error)

          cb(null, response)

      }) // end sendmail()
    } // end sendForgotPasswordEmail
  }
  
})()