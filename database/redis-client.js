var fs = require('fs')
  , path = require('path')
  , qs = require('querystring')
  , ur = require('url')
  , redis = require('redis')
  , isInitComplete = false

var redisConfig = JSON.parse( fs.readFileSync( path.resolve(__dirname, './redis-config.json'), 'utf-8' ) )

var client = redis.createClient(redisConfig.port, redisConfig.host)

client.auth(redisConfig.auth, function(err) {

  if (err){
    console.log('Error trying to auth to redis.')
    return console.error(err)
  }
  else{
    console.log('Authenticated to redis')
  } 

})

client.on('connect', function (err){
  if(err){
    console.log('Error trying to connect to redis.')
    return console.error(err)
  } 
  console.log('redis is connected')
})

client.on('ready', function (err){
  if(err){
    console.log('Error trying to connect to redis.')
    return console.error(err)
    
  } 
  console.log('redis is ready')

  if(!isInitComplete){

    var keys = [{key:'totalPipedPhotos', initialValue: 0}]

    initializeKeys(keys)
    
    isInitComplete = false
    
  }
  
})

client.on('error', function (err){ 
  console.log('Redis errored out somehow...')
  console.error(err)
})

// The reason we have a getter here is when the redis
// client instance is required in other apps, it may not have
// been connected, auth'd, etc.  So we need to return the 
// current reference as opposed to the one that is simply created
// upon requiring this file.
function getClient(){
  return client
}

// Upon firing up, make sure these baseline keys are set
function initializeKeys(keys){
  
  console.log('\n\n Initializing keys \n\n')
  
  keys.forEach(function(el,i){
    
    client.get(el.key, function(e,d){

      if(e) {
        console.log("Error trying to get %s ", el.key)
        return console.error(e)
      }

      // checking for falsey values only is a bad idea
      if(typeof d === 'undefined'){
        
        console.log("Not OK trying to get %s ", el.key)
        
        client.set(el.key, el.initialValue, function(e,d){
          if(e) {
            console.log("Error trying to set %s ", el.key)
            return console.error(e)
          }
          if(d !== 'OK') {
            console.log("Not OK trying to set %s ", el.key)
            return console.warn(el.key + " was not set.")
          }
          if(d === 'OK') {
            console.log("OK setting %s ", el.key)
            client.get(el.key, function(e,d){
             console.log(d) 
            })
          }
          
        }) // end set.
      }
      
      console.log("The value for key %s is %s", el.key, d)
      
    }) // end get
    
  })
} // initializeKeys

module.exports = getClient

