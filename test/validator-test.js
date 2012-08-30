var assert = require("assert")
  , path = require("path")
  , validator = require( path.resolve(__dirname, '..', 'utils/validation.js') ) 
  
describe('Validator', function(){
  describe('#getImageNameWithoutQueryStringOrHash()', function(){
    it('should return an image name without a querystring appended at the end', function(){
      
      assert('pipe.jpg:large', validator.getImageNameWithoutQueryStringOrHash('pipe.jpg:large?maxwidth=220&maxheight=220'))
      assert('pipe.jpg', validator.getImageNameWithoutQueryStringOrHash('pipe.jpg?maxwidth=220&maxheight=220'))
      
    }) // end #getUrlWithoutQueryString()
  })
})

describe('Validator', function(){
  describe('#getUrlPath()', function(){
    it('should return a url without a querystring, hash or anything else.', function(){
      
      assert('http://foo.com/pipe.jpg:large', validator.getUrlPath('http://foo.com/pipe.jpg:large?maxwidth=220&maxheight=220'))
      assert('http://foo.com/pipe.jpg', validator.getUrlPath('http://foo.com/pipe.jpg?#maxwidth=220&maxheight=220'))
      
    }) // end #getUrlWithoutQueryString()
  })
})
