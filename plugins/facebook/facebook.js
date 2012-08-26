var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , exec = require('child_process').exec

var facebook_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'facebook-config.json'), 'utf-8' ) )

exports.Facebook = {
  config: facebook_config,
  getFbPhotoAlbums: function(req,res,cb){
    // if cb does not exist, then we just need to marshall back the json

    // Fetch user's albums (so these are typically photos they have uploaded)
    request.get('https://graph.facebook.com/'+req.session.facebook.id
                +'/albums?access_token='+req.session.facebook.access_token, function(e,r,b){

                  // If this is a request to the server directly,
                  // then there should be no callback
                  if(typeof cb !== 'function'){

                    if(e){
                      res.type('text/plain')
                      return res.status('404').send(e)
                    }

                    var fbAlbumsJson = JSON.parse(b)

                    res.json(fbAlbumsJson.data)

                  }else{

                    if(e){
                      return cb(e,null)
                    }else{
                      var fbAlbumsJson = JSON.parse(b)
                      cb(null, fbAlbumsJson.data)
                    }

                  } // end outer else isRequest

                }) // request.get(fb-albums)
  },
  pipePhotoToFb: function(obj,req,res){
    
    // "source": file binary
    // "message": optional caption
    
    var url = 'https://graph.facebook.com/'
                +req.session.facebook.id
                +'/photos?access_token='
                +req.session.facebook.access_token
    
    var command = 'curl -F "message='+obj.caption+'" -F "source=@'
                  + obj.fullPhotoPath +'" -L '+ url+''

    exec(command, function(err,data){
      if(err) {
        // console.error(err)
        return res.json(err)
      }
      if(data) {
        // console.dir(data,8)
        return res.json(JSON.parse(data))
      }
    })
    
  } // end postPhotoToFb
}