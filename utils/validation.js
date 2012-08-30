var path = require('path')
  , fs = require('fs')
  , qs = require('querystring')
  , url = require('url')

module.exports = (function(){
  
  return {
    // Brute force way of removing querystring and hash
    getImageNameWithoutQueryStringOrHash: function(u){
      var urlObj = url.parse(u)
      return u.replace( urlObj.search, '').replace('#', '')
    },
    // Build path from urlObj after parsing
    getUrlPath: function(u){
      var urlObj = url.parse(u)
      return urlObj.protocol + "//" + urlObj.hostname + urlObj.pathname 
    }
  }
  
})()