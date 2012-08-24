var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , request = require('request')
  , fs = require('fs')
  , everyauth = require('everyauth')

var app = express()

app.configure(function(){
  app.set('port', process.env.PORT || 80)
  app.set('views', __dirname + '/views')
  app.set('view engine', 'ejs')
  app.use(express.favicon(__dirname + '/public/favicon.ico'))
  app.use(express.logger('dev'))
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(express.cookieParser('photopipe'))
  app.use(express.session())
  app.use(app.router)
  app.use(require('stylus').middleware(__dirname + '/public'))
  app.use(express.static(path.join(__dirname, 'public')))
})

app.configure('development', function(){
  app.use(express.errorHandler())
})


/* GET routes */
app.get('/', routes.index)

/* Instagram Module Routes*/

// Remove or comment them if you don't want instagram support (read-only)
app.get('/instagram', routes.instagram)

app.get('/oauth/instagram', routes.instagram_oauth)

// Remove or comment them if you don't want Facebook support
app.get('/facebook', routes.facebook)

app.get('/facebook/get_photo_album_cover', routes.facebook_get_photo_album_cover)

app.get('/facebook/get_photos_from_album_id', routes.facebook_get_photos_from_album_id)

app.get('/facebook/get_photo_albums', routes.facebook_get_photo_albums)

app.get('/facebook/get_tagged_in_photos', routes.facebook_get_tagged_in_photos)

app.get('/oauth/facebook', routes.facebook_oauth)


/* POST routes */
app.post('/smoke', routes.smoke)

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server holdin it down on port " + app.get('port'));
})