var fs = require('fs')
  , path = require('path')
  , qs = require('querystring')
  , ur = require('url')
  , crypto = require('crypto')
  , redis = require('redis')
  , colors = require('colors')
  , bcrypt = require('bcrypt')
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
    
    // TODO: INITIALIZE USERNAMES THAT ARE RESTRICTED (see the routes)
    
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

  function getBcryptHash(password){
    var salt = bcrypt.genSaltSync(10)
    return bcrypt.hashSync(password, salt)
  }
  
  function isPasswordLegit(password, hash){
    return bcrypt.compareSync(password, hash) 
  }
  
  function _generateRandomId(){
    return Math.random().toString(36).slice(2)
  }
  
  function _userSetAddHandler(e,d){
    if(e){
      console.log("User set add data response: %s", d)
      e && console.error(e)
      return
    }
    console.log("User set add data response with no error: %s", d)  
  }
  
  // We need a utility method to handle various redis errors
  function _handleRedisError(e, req, res, cb){
    console.error(e)
    // TODO: Emit some generic redis error event
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
    doesAccountExist: function(setname, email_address, cb){

      client.sismember(setname, email_address, function(err,data){
        if(err) return cb(err)
      
        return cb(null,data)
        
      })
    },
    // Check to see if username exists
    doesUsernameExist: function(setname, username, cb){

      client.sismember(setname, username, function(err,data){
        if(err) return cb(err)
      
        return cb(null,data)
        
      })
    },
    // logs the members of the set
    // setname is the name of the set (string)
    printSetMembers: function(setname, cb){
      client.smembers(setname, function(e,d){
        if(e) return _handleRedisError(e)
        console.log("\nPrinting set members for set %s", setname)
        console.dir(d)
        cb && cb(e,d)
      })
    },
    // Create a new user account in Redis
    // setname is the name of the set to add to
    // hashPrefix is the prefix to identify the hash
    createUserIdentityAccount: function(email_address, password, setname, hashPrefix, cb){
      
      console.log("\nCreating new user account %s", email_address)
      
      // Schema should be:
      var schema = 
      {
        uuid: null,
        username: '',
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
        },
        password: null
      }

      // Generate unique user id
      schema.uuid = sha1(redisConfig.salt, email_address)

      // Generate bcrypt hashed password
      schema.password = getBcryptHash(password)

      // "Official" email address is schema.email_addresses[0]
      // Add it to the email addresses for the user
      schema.email_addresses.push(email_address)

      // Let's add the sha1 hash of the email address to the set (of emails)
      client.sadd(setname, email_address, function(e,d){
        
        // Add email to set handler
        _userSetAddHandler(e,d)

        // Redundant check from where it's being called?
        if( d === 1 ){
          // Add hash to multi-hash in redis
          client.hmset(hashPrefix +":"+schema.uuid, schema, function(e,d){
            // Let's just verify by logging it out.
            client.hgetall(hashPrefix +":"+schema.uuid, function(e,d){
              if(e) return console.error(e)
              console.log('Successfully added user object:')
              console.dir(d)
            })// end hgetall
          }) // end hmset
        }
        
        if(cb){
          return cb(e,d)
        }         
        
      }) // end client.sadd

    },
    addUsernameToAccount: function(email_address, username, setname, hashPrefix, cb){
      // First, fetch the account
      var uuid = sha1(redisConfig.salt, email_address)
      
      client.hgetall(hashPrefix + ":" + uuid, function(e,data){
        
        if(e) return cb(e,null)

        // Set the username on the data object
        data.username = username
        
        // Now stash it
        client.hmset(hashPrefix +":"+uuid, data, function(e,data){

          if(e) return cb(e)
          
          else cb(null,data)

        }) // end hmset
        
        // Now, add the username to the set...
        client.sadd(setname, username, function(e,data){
          if(e) return console.error(e)
          else return console.log("Successfully added "+ username +" to the set " + setname)
        }) // end sadd
        
      }) // end hgetall()
      
    },
    // Sends back via callback a boolean if there is no error.
    // The boolean is whether or not it matches the password stored in the
    // hash.
    getUsername: function(email_address, hashPrefix, cb){
      
      var uuid = sha1(redisConfig.salt, email_address)
      
      client.hget(hashPrefix+":"+uuid, 'username', function(err,hash_username){
        
        if(err) return console.error(err)
        
        return cb(null,hash_username)
        
      })
      
      
    },
    verifyPassword: function(email_address, password, hashPrefix, cb){
      // First, fetch the account
      var uuid = sha1(redisConfig.salt, email_address)
      
      client.hget(hashPrefix +":"+uuid, 'password', function(err,data){
        if(err) return cb(err)

        // We have a match?
        var isLegit = isPasswordLegit(password,data)

        console.log( isLegit ? "Password is legit" : "Password is not legit")
        
        return cb(null, isLegit )

      }) // end hget
      
    },    // Delete user's account from Redis.
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
    wipeUserAccountPassword: function(email_address, hashPrefix, cb){
      
      // First, fetch the account
      var uuid = sha1(redisConfig.salt, email_address)
      
      client.hgetall(hashPrefix + ":" + uuid, function(e,data){
        
        if(e) return cb(e,null)

        // Reset the password
        data.password = ''
        
        // Now stash it
        client.hmset(hashPrefix +":"+uuid, data, function(e,data){

          if(e) return cb(e)
          
          else cb(null,data)

        }) // end hmset
        
      }) // end hgetall()
            
    },
    createTemporaryUrl: function(email_address, cb){
      
      // If there is a callback, then pass the url as the last arg
      if(cb){
        return cb(null,email_address,"/account/temp?unique=" + _generateRandomId())
      }

      // Otherwise, just send me the string...
      return "/account/temp?unique=" + _generateRandomId()
      
    },
    addHashToEmail: function(email_address, unique, cb){
      // Strip the hash off the end
      var hash = unique.split('=')[1]
      // console.log(hash + " is the hash from the qs")
      client.set(hash,email_address,function(err,data){
        cb && cb(err,data)
      })
    },
    fetchEmailFromUniqueHash: function(unique, cb){
      client.get(unique, function(err,data){
        if(err) {
          console.error(err)
          return err
        }
        else{
          if(!data) return cb(new Error('Email adddress not found for hash '+unique))
          else return cb(null,data) // data should be an email address
        }
      }) // end get()
    },
    updatePassword: function(email_address, password, hashPrefix, cb){
      // First, fetch the account
      var uuid = sha1(redisConfig.salt, email_address)
      
      client.hgetall(hashPrefix + ":" + uuid, function(e,data){
        
        if(e) return cb(e,null)

        // Reset the password
        data.password = getBcryptHash(password)
        
        // Now stash it
        client.hmset(hashPrefix +":"+uuid, data, function(e,data){

          if(e) return cb(e)
          
          else cb(null,data)

        }) // end hmset
        
      }) // end hgetall()
    },
    // Callback after setting user to the set of users
    userSetAddHandler: _userSetAddHandler,
    // Callback afters setting user's hash of key/values in Redis
    userSetHashHandler: function(e,d){

      if(e || (d !== 'OK') ){
        console.log("User hash set data response: %s", d)
        return console.error(e)
      }

      console.log("User hash set add data response with no error: %s", d)

      var uuid = sha1('photopipe', email_address)

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

