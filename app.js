var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , request = require('request')
  , cluster = require('cluster')
  , fs = require('fs')

var app = express()

app.configure(function(){
  app.set('port', process.env.PORT || 1337)
  app.set('views', __dirname + '/views')
  app.set('view engine', 'ejs')
  app.use(express.favicon(__dirname + '/public/favicon.ico'))
  app.use(express.logger('dev'))
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.use(app.router)
  app.use(require('stylus').middleware(__dirname + '/public'))
  app.use(express.static(path.join(__dirname, 'public')))
})

app.configure('development', function(){
  app.use(express.errorHandler())
})

app.get('/', routes.index)

app.post('/smoke', routes.smoke)

// Start the server...
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server holdin it down on port " + app.get('port'));
})
