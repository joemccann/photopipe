var fs = require('fs')
  , path = require('path')
  , request = require('request')

var instagram_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'instagram-config.json'), 'utf-8' ) )

var Instagram = require('instagram-node-lib')

Instagram.set('client_id', instagram_config.client_id)
Instagram.set('client_secret', instagram_config.client_secret)
Instagram.set('redirect_uri', instagram_config.redirect_uri)

Instagram.photopipe = {
  getUserRecentPhotos: function(req,res){
    // Let's grab the user's recent photos from their feed.
    Instagram.set('access_token', req.session.instagram.access_token)

    Instagram.users.recent({ 
      user_id: req.session.instagram.user.id,
      error: function(errorMessage, errorObject, caller, response){
       var err = JSON.parse(errorObject)
       // Revoke the sessions if code === 400
       if(err.meta.code === 400) req.session.instagram = null
       return res.status(err.meta.code).send(err.error_message)
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
  getNextPageOfInstagramPhotos: function(req,res){

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
       var err = JSON.parse(errorObject)
       // Revoke the sessions if code === 400
       if(err.meta.code === 400) req.session.instagram = null
       return res.status(err.meta.code).send(err.error_message)
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
  }
}

exports.Instagram = Instagram