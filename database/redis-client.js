var fs = require('fs')
  , path = require('path')
  , qs = require('querystring')
  , ur = require('url')
  , crypto = require('crypto')
  , redis = require('redis')
  , colors = require('colors')
  , isInitComplete = false

var redisConfig = JSON.parse( fs.readFileSync( path.resolve(__dirname, './redis-config.json'), 'utf-8' ) )

var client = redis.createClient(redisConfig.port, redisConfig.host)

// Upon firing up, make sure these baseline keys are set
var initializeKeys = function(keys){

  console.log('\nInitializing keys in Redis...\n')

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

      console.log("The value for key %s is %s", el.key.yellow, d.green)

    }) // end get

  })
} // initializeKeys

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
  if(!isInitComplete) console.log('Redis is now connected.')
})

client.on('ready', function (err){
  
  if(err){
    console.log('Error trying to connect to redis.')
    return console.error(err)
  } 

  if(!isInitComplete){

    console.log('Redis is ready')

    var keys = [{key:'totalPipedPhotos', initialValue: 0}]

    initializeKeys(keys)
    
    isInitComplete = true

  }
  
})

client.on('error', function (err){ 
  console.log('Redis errored out somehow...')
  console.error(err)
})

module.exports = (function(){
  
  function sha1 (key, body) {
    return crypto.createHmac('sha1', key).update(body).digest('base64')
  }

  return {
    // The reason we have a getter here is when the redis
    // client instance is required in other apps, it may not have
    // been connected, auth'd, etc.  So we need to return the 
    // current reference as opposed to the one that is simply created
    // upon requiring this file.
    getClient: function(){
      return client
    },
    // Check to see if account exists
    doesAccountExist: function(uuid, cb){
      console.warn("doesAccountExist is not implemented.")
      return false
    },
    // logs the members of the set
    // setname is the name of the set (string)
    printSetMembers: function(setname, cb){
      client.smembers(setname, function(e,d){
        if(e) return console.error(e)
        console.log("\nPrinting set members for set %s", setname)
        console.dir(d)
        cb && cb(e,d)
      })
    },
    // Create a new user account in Redis
    // setname is the name of the set to add to
    // hashPrefix is the prefix to identify the hash
    createUserIdentityAccount: function(userObj, setname, hashPrefix, cb){
      
      console.log("\nCreating new user account %s", userObj.network.username)
      
      /*
      userObj = {
        network: {
          type : 'facebook',
          first_name: 'Joe',
          last_name: 'McCann',
          username: 'joemccann',
          full_name: 'Joe McCann'
        },
        email_address: 'joseph.isaac@gmail.com',
        oauth: {}
      }
      */
      
      // TODO: CHECK IF HASH EXISTS

      // Schema should be:
      var schema = 
      {
        uuid: null,
        networks: { 
          twitter: {},
          facebook: {},
          instagram: {},
          flickr: {},
          dropbox: {},
          google_drive: {}
        },
        email_addresses: [],
        cache: {
          twitter: null,
          facebook: null,
          instagram: null,
          flickr: null,
          dropbox: null,
          google_drive: null
        }
      }

      // Generate unique user id
      schema.uuid = sha1(redisConfig.salt, userObj.email_address)

      // "Official" email address is schema.email_addresses[0]
      // Add it to the email addresses for the user
      schema.email_addresses.push(userObj.email_address)

      // Let's 
      client.sadd(setname, schema.uuid, function(e,d){

        if(cb){
          return cb(e,d)
        } 
        
        userSetAddHandler(e,d)

        client.hmset(hashPrefix +":"+schema.uuid, userObj, hmsetCb || userSetHashHandler)
        
      })

    },
    // Delete user's account from Redis.
    deleteUserIdentityAccount: function(userObj, setname, hashPrefix, cb){

      // client.srem('users',userObj.uuid, redis.print)

      var _uuid = sha1('photopipe', userObj.email_address)
      
      client.srem(setname, _uuid, function(e,d){
        
        if(cb){
          return cb(e,d)
        } 
        
        userSetRemoveHandler(e,d)

        client.hdel(hashPrefix+':'+_uuid, userObj, userDeleteHashHandler)
        
      })
      

    },
    // Callback after setting user to the set of users
    userSetAddHandler: function(e,d){
      if(e){
        console.log("User set add data response: %s", d)
        e && console.error(e)
        return
      }
      console.log("User set add data response with no error: %s", d)  
    },
    // Callback afters setting user's hash of key/values in Redis
    userSetHashHandler: function(e,d){

      if(e || (d !== 'OK') ){
        console.log("User hash set data response: %s", d)
        return console.error(e)
      }

      console.log("User hash set add data response with no error: %s", d)

      var uuid = sha1('photopipe', userObj.email_address)

      client.hgetall("user:"+uuid, userGetAllHashHandler)

    },
    // Callback after setting user's hash of key/values in Redis
    userGetAllHashHandler: function(e,d){
      if(e){
        console.log("User hash get data response: %s", d)
        return console.error(e)
      }
      console.log("User hash get data response with no error: %s", JSON.stringify(d))
      console.dir(d)

    },
    // Callback after deleting user's hash of key/values in Redis
    userDeleteHashHandler: function(e,d){

      if(e){
        console.log("User hash delete data response: %s", d)
        return console.error(e)
      }

      console.log("User hash was deleted successfully.")

    },
    // Callback afterr removing user from users set in Redis
    userSetRemoveHandler: function(e,d){

      if(e){
        console.log("userSetRemoveHandler data response: %s", d)
        return console.error(e)
      }

      console.log("userSetRemoveHandlerresponse with no error: %s", d)

      // printSetMembers('users')

    }
  }
  
})()

