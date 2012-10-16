var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , qs = require('querystring')
  , _ = require('lodash')
  , colors = require('colors')
  , urlUtil = require('url')
  , delay = false 

// delay is for For async requests to 3rd parties for photos, 
// we will delay the overall response until delay is false again
// A bit of a hack, but it works.

var twitter_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'twitter-config.json'), 'utf-8' ) )

// Check the response mime type if it is
// text/html and it contains "capacity" in
// the response, then it is over capacity
function isTwitterOverCapacity(){
  console.warn('Not implemented: isTwitterOverCapatcity()')
  return false
}

// A comparison of the current media item with the
// first cached item to determine when to stop iterating
// through the set of aggregate media items.
function isItemFirstCacheItem(item, cached_item){
  return item === cached_item
}

// Let's normalize the response of media data to only include
// the photos we want.
function normalizeTwitterData(data,req,res){
  
  var normalized = {
    error: false,
    error_message: '',
    media: []
  }
  
  // console.dir(req.session.twitter)
  
  if( isTwitterOverCapacity() ){
    normalized.error = true
    normalized.error_message = "It appears Twitter is over capacity. Try again." 
  }
  else{
    
    console.log("Twitter Response array length: %s\n", data.length)
    // If the media response is empty...
    if(!data.length){
      normalized.error = true
      normalized.error_message = "We were unable to fetch any images from your media timeline."
      console.dir(data) 
      return processNormalizedResponse(normalized, req, res)
    }
    
    // We use a for loop so we can break out if
    // the cache is met
    for(i=0, len = data.length; i<len; i++){
      
      var el = data[i]

      // console.dir(el)
      // TODO: Session won't stash this much data so switch this logic to pull from redis.
      if( req.session.media_cache && isItemFirstCacheItem(el.id, req.session.media_cache.latest_id ) ){
        console.log('\n\nCache is same so we are breaking...\n\n')
        // update latest_id in cache
        normalized.latest_id = el.id
        // Now process the the response with new updated normalized data
        processNormalizedResponse(normalized, req, res)
        break
      }
      
      // The first time we run this, we need to stash the latest_id
      if( i === len-1 ){
        normalized.latest_id = data[0].id
      }
      
      // In the case of just pic.twitter.com....
      if(el.entities && el.entities.media && el.entities.media.length){

        var twitMediaObj = el.entities.media[0]

        var item = {
          full_url: twitMediaObj.media_url+":large",
          thumb_url: twitMediaObj.media_url+":thumb",
        }
        
        normalized.media.push(item)          

      }
      // Otherwise, we have 3rd part attributed providers.
      else if(el.entities && el.entities.urls && el.entities.urls.length && el.entities.urls[0].display_url){

        var url = el.entities.urls[el.entities.urls.length-1].display_url

        if(url.indexOf('instagr.am') > -1){

          var item = {
            full_url: "https://" + url + "/media/?size=l",
            thumb_url: "https://" + url + "/media/?size=t",
          }
          
          normalized.media.push(item)          
        
        }
        if(url.indexOf('twimg.com') > -1){
      
        // https://p.twimg.com/A128d2CCIAAPt--.jpg:small
        // https://p.twimg.com/A128d2CCIAAPt--.jpg:large
        
        }
        if(url.indexOf('flickr.com') > -1){
          /*
        
          <div class="thumbnail-wrapper" data-url="http://flickr.com/groups/dalekcakes">
            <img class="scaled-image" src="//farm7.static.flickr.com/6140/5917491915_8e92c65aa8.jpg"></div>
        
          */
        
          // WILL NEED TO FIGURE OUT FLICKR RESPONSE
        
          // Requires API call via photo ID, or just use twitter:
        
          /*
          https://widgets.platform.twitter.com/services/rest?jsoncallback=jQuery15205886323538143188_1346683837796&format=json&api_key=2a56884b56a00758525eaa2fee16a798&method=flickr.photos.getInfo&photo_id=7275880290&_=1346683837809
          */
        
          console.dir(el)
        }
        if(url.indexOf('twitpic.com') > -1){
      
          // POP OFF ID OF END OF TWITPIC URL
          // http://twitpic.com/9k68zj

          var url_id = url.split('com')[1] // includes slash

          var item = {
            full_url: "https://twitpic.com/show/iphone" + url_id,
            thumb_url: "https://twitpic.com/show/iphone" + url_id,
          }

          normalized.media.push(item)          
      
        }
        // if(url.indexOf('etsy.am') > -1){}

        if(url.indexOf('twitgoo.com') > -1){
          // http://twitgoo.com/66akxy/img

          var item = {
            full_url: url + '/img',
            thumb_url: url + '/img',
          }

          normalized.media.push(item)          

        }
        if(url.indexOf('dailybooth.com') > -1){
          
          request({
            followRedirect: false,
            uri: 'http://'+url,
            callback: function(e,r,b){
              if(e) console.error(e)

              var id = r.headers.location.split('/').pop()
              
              request({
                uri: "https://api.dailybooth.com/v1/picture/" + id + ".json",
                json: true,
                callback: function(e,r,b){
                  if(e) return console.error(e)
                  /*
                  urls: 
                    { tiny: 'http://d1oi94rh653f1l.cloudfront.net/15/pictures/tiny/78e4b486c80b29435504d94fdf626b7c_29230840.jpg',
                      small: 'http://d1oi94rh653f1l.cloudfront.net/15/pictures/small/78e4b486c80b29435504d94fdf626b7c_29230840.jpg',
                      medium: 'http://d1oi94rh653f1l.cloudfront.net/15/pictures/medium/78e4b486c80b29435504d94fdf626b7c_29230840.jpg',
                      large: 'http://d1oi94rh653f1l.cloudfront.net/15/pictures/large/78e4b486c80b29435504d94fdf626b7c_29230840.jpg' 
                    }
                  
                  { error: 
                     { error: 'rate_limit',
                       error_description: 'Rate limit exceeded.',
                       error_code: 412 } }
                  var item = {
                    full_url: b.urls.large + '/img',
                    thumb_url: b.urls.small + '/img',
                  }
                  */
                  
                  if( (r.statusCode >= 400) || b.error) {
                    console.log('Fail. '.red +'Status Code for Daily Booth request:  %s', r.statusCode)
                    console.error(b.error)
                  }
                  else{
                    
                    var item = {
                      full_url: b.urls.large,
                      thumb_url: b.urls.small,
                    }
                    
                    normalized.media.push(item)          
                  }
                  
                  delay = false
                  
                  processNormalizedResponse(normalized, req, res)
                  
                } // end inner request callback
              }) // end request()
            } // end outer request callback
          }) // end request()
          
          // Because of the async nature of the above request() calls,
          // we set the delay here and mark it false in the last callback
          if(!delay) delay = true
          
        }
        if(url.indexOf('yfrog.com') > -1){
          // console.dir(el)

          var item = {
            full_url: "https://" + url + ":tw1",
            thumb_url: "https://" + url + ":tw1",
          }

          normalized.media.push(item)          
        
        }
        // if(url.indexOf('lockerz.am') > -1){}
        // if(url.indexOf('kiva.am') > -1){}

        // if(url.indexOf('kickstarter.com') > -1){}
        if(url.indexOf('dipdive.com') > -1){
          isVideo = false || true; // could be photo
        
        }
        // if(url.indexOf('photobucket.com') > -1){}
        // if(url.indexOf('with.me') > -1){}
        // if(url.indexOf('facebook.com') > -1){}
        if(url.indexOf('deviantart.com') > -1 || url.indexOf('fav.me') > -1){
        
          // TODO: IMAGES DON'T SHOW UP?
        
        }
      
      } // end if el.entities.url

    } // end forloop
    
  } // end else capacity
  
  return processNormalizedResponse(normalized, req, res)
  
}

// Process the response, cache the normalized data
// TODO: Cache the response
function processNormalizedResponse(normalized, req, res){
  if(!delay){
    // stash normalized in cache and return normalized
    console.log('\n\nDone!\n\n')
    if(!req.session.media_cache) req.session.media_cache = normalized
    // console.dir(req.session.media_cache)
    return res.json(normalized)
  }
  else{
    setTimeout(function(){
      // We have to check again for delay due to race conditions.
      if(delay) return processNormalizedResponse(normalized, req, res)
    },10)
  }
}

// Twitter OAuth
exports.Twitter = {
  config: twitter_config,
  generateAuthUrl: function(req,res,cb){
    
    var url = twitter_config.request_token_URL
      , oauth = { 
                  callback: twitter_config.callback_URL
                  , consumer_key: twitter_config.consumer_key
                  , consumer_secret: twitter_config.consumer_secret
                }
    
    // Create your auth_url for the view   
    request.post({url:url, oauth:oauth}, function (e, r, body) {
      
      if(e) return cb(e,null)

      var auth_url = twitter_config.authorize_URL_https + "?" + body

      // console.log(auth_url + " is the auth_url")      

      cb(null,auth_url)

    }) // end request.post()
    
  },
  getMediaTimeline: function(req,res,cb){
    
    if(!req.session.twitter.oauth) return res.status(403).send('User not authorized. Please reauthenticate with twitter.')
    
    // console.log('We have a session so lets get media timeline')
    // var url = 'http://api.twitter.com/1/statuses/user_timeline.json?'
    var url = 'http://api.twitter.com/1/statuses/media_timeline.json?'
      , params = 
        { screen_name: req.session.twitter.oauth.screen_name
        , user_id: req.session.twitter.oauth.user_id
        , count: 20000
        , include_entities: true
        , offset: 0
        , score: true
        , mode: 'photos'
        , filter: false
        , is_event: false
        }
      
    // console.dir(perm_token)
    
    url += qs.stringify(params)
    
    // console.dir(req.session.twitter.oauth)

    request.get({url:url, oauth: req.session.twitter.oauth, json:true}, function (e, r, data) {
      if(e) return console.error(e)

      // console.dir(data)
      
      return normalizeTwitterData(data, req, res)
      
    })

  },
  pipeToTwitter: function(echo, req, res){
    
    if(!req.session.twitter.oauth){
      res.type('text/plain')
      return res.status(403).send("You are not authenticated with Twitter.")
    } 
    
    // TODO: EVENTUALLY WE WILL NEED TO CHECK THE 
    // https://api.twitter.com/1/help/configuration.json
    // RESPONSE THAT CONTAINS SHORT URL CHARS AND MAX MEDIA UPLOADS
    // SEE https://dev.twitter.com/docs/api/1/get/help/configuration
    
    var oauth = req.session.twitter.oauth
    var uri = 'https://upload.twitter.com/1/statuses/update_with_media.json'
    var method = 'POST'

    var r = request.post({
      oauth: req.session.twitter.oauth,
      uri: uri,
      callback: function(e,r,data){
        if(e) {
          console.error(e)
          return res.json(e)
        }
        if(data) {
          // NOTE:  If the user tries to exceed the number of updates allowed, 
          // this method will also return an HTTP 403 error, similar to POST statuses/update.
          // TODO: CHECK FOR THIS!!
          return res.json(data)
        }        
      }
    })

    var form = r.form()
    form.append('status', echo.caption || "photopi.pe")
    form.append('media[]', fs.createReadStream(echo.fullPhotoPath))
   
    
  }
} // end exports.Twitter

/* These are videos:

case "WhoSay": 
case "Photozou": 
case "Vimeo": 
case "Ustream":
case "Youtube": 
case "Vevo": 
case "TwitVid": 
case "GoogleVideo": 
case "JustinTV": 
case "MTV": 
case "WashingtonPost": 
case "MSNBC": 
case "CNN": 
case "Apple": 
case "Rdio": 
case "SlideShare": 
case "BlipTV": 
case "Livestream": 
case "WallStreetJournal": 
case "Hulu": 
case "NHL": 
case "Meetup": 
case "Plancast": 
case "Gowalla": 
case "Foursquare": 
case "Amazon": 
case "AolVideo": 
case "WordPress": 
case "Pepsi":
*/