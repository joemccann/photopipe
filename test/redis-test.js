var assert = require("assert")
  , path = require("path")
  , crypto = require('crypto')
  
/* Test obj */
var userObj = {
    network: {
      type : 'twitter',
      first_name: 'Joe',
      last_name: 'McCann',
      username: 'test-user-joe'
    },
    email_address: 'joseph.isaac@gmail.com',
    oauth: {}
  }

var setname = 'users-test'
  , hashPrefix = 'user-test'
  , test_uuid = sha1('photopipe', userObj.email_address)

function sha1 (key, body) {
  return crypto.createHmac('sha1', key).update(body).digest('base64')
}

// describe('Validator', function(){
//   describe('#getUrlPath()', function(){
//     it('should return a url without a querystring, hash or anything else.', function(){
//       
//       assert('foo', 'foo')
//       
//     }) // end #getUrlPath()
//   })
// })


describe('Connection', function(){
  
  var db_client = require( path.resolve(__dirname, '..', 'database/redis-client.js') ) 
  
  before(function(done){
    
      if( !db_client.getClient() ){
        console.log('Redis client not created.')
      } 
      else{
        console.log('Redis client created.')
      }
      
      // Delete the set entry, delete the user-test entry
      db_client.deleteUserIdentityAccount(userObj, setname, hashPrefix, function(e,d){
        if(e) return done(e)
        
        // the hdel would typically be called from within createUserIdentityAccount()
        // this is probably bad form
        db_client.getClient().hdel(hashPrefix+':'+test_uuid, userObj, function(e,d){
          if(e) return done(e)
          console.log("\nUser account %s was deleted.\n", userObj.network.username)
          done()
        })
        
      })

      // done()      
  }) // end beforeEach()
  
  describe('#createUserIdentityAccount()', function(){

    it('create a user account in redis and add to set', function(done){
      
      db_client.createUserIdentityAccount(userObj, setname, hashPrefix, function(e,d){
        
        if(e) return done(e)

        var preAssert = (d === 1) ? "Added to set" : "Not added to set"

        db_client.getClient().hmset(hashPrefix +":"+test_uuid, userObj, function(e,d){
          if(e) return done(e)

          var postAssert = (d === 'OK') ? "Added to hmset" : "Not added to hmset"

          assert.strictEqual(preAssert, "Added to set")
          assert.strictEqual(postAssert, "Added to hmset")
          done()
        })
        
      
      }) // end createUserIdentityAccount()
    }) // end it
  }) // describe('#createUserIdentityAccount()'


  describe('#printSetMembers(setname)', function(){

    it('print out all members of the users-test set', function(done){
      
      db_client.printSetMembers(setname, function(e,d){
        
        if(e) return done(e)
        
        assert.strictEqual(d[0], test_uuid)
        done()
        
      })
      
    }) // end it
  }) // describe('#printSetMembers(setname)'
  
  
}) // describe('Connection'
