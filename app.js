var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , request = require('request')
  , cluster = require('cluster')
  , fs = require('fs')
  , os = require('os')

var app = express()

app.configure(function(){
  app.set('port', process.env.PORT || 80)
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


/* GET routes */
app.get('/', routes.index)

app.get('/instagram', routes.instagram)

app.get('/oauth/instagram', routes.instagram_oauth)


/* POST routes */
app.post('/smoke', routes.smoke)

/*
if (cluster.isMaster){
  
  var numCPUs = os.cpus().length

  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork()
  }
  
  cluster.on('death', function(worker) {
    // We need to spin back up on death.
    cluster.fork()
    console.log('Worker ' + worker.pid + ' died. :(');
  })

}
else{ 
  http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server holdin it down on port " + app.get('port'));
  })
}
*/

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server holdin it down on port " + app.get('port'));
})