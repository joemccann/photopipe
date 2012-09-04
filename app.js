var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , request = require('request')
  , fs = require('fs')
  , db_client 

var app = express()

app.configure(function(){
  app.set('port', process.env.PORT || 80)
  app.set('views', __dirname + '/views')
  app.set('view engine', 'ejs')
  app.use(express.favicon(__dirname + '/public/favicon.ico'))
  app.use(express.logger('dev'))
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(require('stylus').middleware(__dirname + '/public'))
  app.use(express.static(path.join(__dirname, 'public')))
  app.use(express.cookieParser('photopipe'))
  app.use(express.cookieSession())
  app.use(app.router)
  // Setup local variables to be available in the views.
  app.locals.title = "PhotoPipe - Download Instagram Photos, Download Facebook Galleries, Post to Twitter and More!"
  app.locals.description = "PhotoPipe is a free service so you can download Instagram Photos, download Facebook galleries, Post to photos to Twitter and More!"
  app.locals.node_version = process.version
  
  // For the user databases, if you don't want redis, remove this line
  db_client = require( path.resolve(__dirname, "./database/redis-client.js") ).getClient
  
})

app.configure('development', function(){
  app.use(express.errorHandler())
})


/************************** PhotoPipe Main **************************/

/* GET routes */
app.get('/', routes.index)

app.get('/wtf', routes.wtf)

app.get('/not-implemented', routes['not-implemented'])

/* POST routes */
app.post('/smoke', routes.smoke)

app.get('/download/file', routes.download_file)


/************************** Twitter Support **************************/

// Remove or comment below if you don't want Facebook support
var twitter_routes = require('./routes/twitter')

app.get('/twitter', twitter_routes.twitter)

app.get('/twitter/get_media_timeline', twitter_routes.twitter_get_media_timeline)

app.get('/oauth/twitter', twitter_routes.twitter_oauth)

/************************** Instagram Support **************************/

// Remove or comment below if you don't want instagram support (read-only)
var instagram_routes = require('./routes/instagram')

app.get('/instagram', instagram_routes.instagram)

app.get('/instagram/get_user_recent_photos', instagram_routes.instagram_get_user_recent_photos)

app.get('/instagram/get_next_page_user_recent_photos', instagram_routes.instagram_get_next_page_user_recent_photos)

app.get('/oauth/instagram', instagram_routes.instagram_oauth)


/************************** Facebook Support **************************/

// Remove or comment below if you don't want Facebook support
var facebook_routes = require('./routes/facebook')

app.get('/facebook', facebook_routes.facebook)

app.get('/facebook/get_photo_album_cover', facebook_routes.facebook_get_photo_album_cover)

app.get('/facebook/get_photos_from_album_id', facebook_routes.facebook_get_photos_from_album_id)

app.get('/facebook/get_photo_albums', facebook_routes.facebook_get_photo_albums)

app.get('/facebook/get_tagged_in_photos', facebook_routes.facebook_get_tagged_in_photos)

app.get('/facebook/get_next_page_user_photos', facebook_routes.facebook_get_next_page_user_photos)

app.get('/oauth/facebook', facebook_routes.facebook_oauth)


// Spin up le server...
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server holdin it down on port " + app.get('port'));
})