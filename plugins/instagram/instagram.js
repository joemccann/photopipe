var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , _ = require('lodash')

var instagram_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'instagram-config.json'), 'utf-8' ) )

var Instagram = require('instagram-node-lib')

Instagram.set('client_id', instagram_config.client_id)
Instagram.set('client_secret', instagram_config.client_secret)
Instagram.set('redirect_uri', instagram_config.redirect_uri)

function defaultErrorHandler(req,res,errorMessage, errorObject, caller, response){

  if( !_.isObject( errorObject) ){
    console.log('Not an error object')
    console.dir(errorObject)
    return res.status(500).send(errorObject || "Something weird with Instagram API. Try again.")
  }
  console.dir(errorObject)
  var err = errorObject.meta
  var message = err ? err.error_message : (errorMessage ||'Something went awry. Try again.')
  var code = err ? err.code : 500
  return res.status(code).send(message)
  
}

Instagram.photopipe = {
  getUserRecentPhotos: function(req,res,cb){
    // Let's grab the user's recent photos from their feed.
    Instagram.set('access_token', req.session.instagram.access_token)

    Instagram.users.recent({ 
      user_id: req.session.instagram.user.id,
      error: function(errorMessage, errorObject, caller, response){
        console.error('eror')
        return cb()
        
        console.error(errorObject)
        
        var err = JSON.parse(errorObject)
        // Revoke the sessions if code === 400
        if(err.meta.code === 400) req.session.instagram = null
       
        if(cb) return cb(err)
       
       return res.status(err.meta.code).send(err.error_message)
      },
      complete: function(data,page){
        console.error('complete')
        
        // We are going to push the pagination object
        // as the last item in the data array.
        // IMPORTANT: Client side code should reflect this
        data.push(page)
        // console.dir(data,5)

        // unset access_token --> 
        // this is probably pretty bad in practice actually (race conditions)
        Instagram.set('access_token', null)
        
        if(cb) return cb(null,data)
        else return res.json(data)
          
      } // end complete 
    
    }) // end recent
    
  },
  getNextPageOfInstagramPhotos: function(req,res,cb){

    var url = req.query.next_page_url
    
    request({url: url}, function(e,r,b){
      if(e) {
        console.error(e)
        return res.json(e)
      }
      var parsedBody = JSON.parse(b)
      var respJson = parsedBody.data
      // In order to keep the response from instagram API
      // similar to the response that is sent back by the 
      // instagram node module, we need to change it a bit
      // by pushing this object on the end of the array.
      respJson.push(parsedBody.pagination)
      return res.json(respJson)
    })
    
  },
  executeSearch: function(req,res){

    // Let's grab the user's recent photos from their feed.
    Instagram.set('access_token', req.session.instagram.access_token)
    
    var query = req.body.search_query
    
    console.log(query + " is the search query.")

    Instagram.tags.recent({ 
      name: req.body.search_query,
      error: function(errorMessage, errorObject, caller, response){
        defaultErrorHandler(req,res,errorMessage, errorObject, caller, response)
      },
      complete: function(data,page){
        
        // We are going to push the pagination object
        // as the last item in the data array.
        // IMPORTANT: Client side code should reflect this
        data.push(page)
        // console.dir(data,5)

        // unset access_token --> 
        // this is probably pretty bad in practice actually (race conditions)
        Instagram.set('access_token', null)

        return res.json(data)
      } // end complete 
    
    }) // end recent    
  },
  executeGeoSearch: function(req,res){

    // Let's grab the user's recent photos from their feed.
    Instagram.set('access_token', req.session.instagram.access_token)
    
    var lat = req.body.latitude
      , lng = req.body.longitude
      , distance = req.body.distance || 5000
    
    console.log(lat + " is the latiude.")
    console.log(lng + " is the longitude.")
    console.log(distance + " is the distance.")

    Instagram.media.search({
      lat: lat, 
      lng: lng, 
      distance: distance,
      error: function(errorMessage, errorObject, caller, response){
        defaultErrorHandler(req,res,errorMessage, errorObject, caller, response)
      },
      complete: function(data,page){
        
        // We are going to push the pagination object
        // as the last item in the data array.
        // IMPORTANT: Client side code should reflect this
        data.push(page)
        // console.dir(data,5)

        // unset access_token --> 
        // this is probably pretty bad in practice actually (race conditions)
        Instagram.set('access_token', null)

        return res.json(data)
      } // end complete 
    
    }) // end recent    
  },
  
}

exports.Instagram = Instagram