var exec = require('child_process').exec
  , fs = require('fs')
  , path = require('path')

var _config = JSON.parse(fs.readFileSync( path.join(__dirname, 'bv-config.json'), 'utf-8' ))

exports.pipeToBv = function(obj,response){

  var command = 'curl -F "contenttype=review" -F "apiversion='
                + _config.apiversion +'" -F "passkey='
                + _config.passkey +'" -F "userId='
                + _config.userId +'" -F "photo=@'
                + obj.fullPhotoPath +'" -L '+ _config.url+''
  
  exec(command, function(err,data){
    if(err) return response.json(err)
    if(data) return response.json(err || JSON.parse(data))
  })
  
}