/* Some jQuery Plugins */


/*
 * Viewport - jQuery selectors for finding elements in viewport
 *
 * Copyright (c) 2008-2009 Mika Tuupola
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *  http://www.appelsiini.net/projects/viewport
 *
 */
(function($) {

    $.belowthefold = function(element, settings) {
        var fold = $(window).height() + $(window).scrollTop();
        return fold <= $(element).offset().top - settings.threshold;
    };

    $.abovethetop = function(element, settings) {
        var top = $(window).scrollTop();
        return top >= $(element).offset().top + $(element).height() - settings.threshold;
    };

    $.rightofscreen = function(element, settings) {
        var fold = $(window).width() + $(window).scrollLeft();
        return fold <= $(element).offset().left - settings.threshold;
    };

    $.leftofscreen = function(element, settings) {
        var left = $(window).scrollLeft();
        return left >= $(element).offset().left + $(element).width() - settings.threshold;
    };

    $.inviewport = function(element, settings) {
        return !$.rightofscreen(element, settings) && !$.leftofscreen(element, settings) && !$.belowthefold(element, settings) && !$.abovethetop(element, settings);
    };

    $.extend($.expr[':'], {
        "below-the-fold": function(a, i, m) {
            return $.belowthefold(a, {
                threshold: 0
            });
        },
        "above-the-top": function(a, i, m) {
            return $.abovethetop(a, {
                threshold: 0
            });
        },
        "left-of-screen": function(a, i, m) {
            return $.leftofscreen(a, {
                threshold: 0
            });
        },
        "right-of-screen": function(a, i, m) {
            return $.rightofscreen(a, {
                threshold: 0
            });
        },
        "in-viewport": function(a, i, m) {
            return $.inviewport(a, {
                threshold: 0
            });
        }
    });


})(jQuery);
/* End jQuery Plugins */

$(function(){
  
  // Yes, this is needed...
  String.prototype.regexIndexOf = function(regex, startpos) {
      var indexOf = this.substring(startpos || 0).search(regex);
      return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
  }
  
  var $twitter = $('#twitter')
    , $facebook = $('#facebook')
    , $instagram = $('#instagram')
    , $twitterDestination = $('.twitter-destination')
    , $facebookDestination = $('.facebook-destination')
    , $downloadDestination = $('.download-destination')
    , $stepOne = $('#step-one')
    , $stepTwo = $('#step-two')
    , $stepThree = $('#step-three')
    , $stepFour = $('#step-four')
    , $photoPickerTwitter = $('#photo-picker-twitter')
    , $photoPickerFacebook = $('#photo-picker-facebook')
    , $galleryPickerFacebook = $('#gallery-picker-facebook')
    , $photoPickerInstagram = $('#photo-picker-instagram')
    , $twitterLoadMore = $('#twitter-load-more')
    , $facebookLoadMore = $('#facebook-load-more')
    , $instagramLoadMore = $('#instagram-load-more')
    , $facebookGallery = $('#facebook-gallery')
    , $oneUpTwitter = $('#one-up-twitter')
    , $oneUpFacebook = $('#one-up-facebook')
    , $oneUpInstagram = $('#one-up-instagram')
    , $oneUpFacebookWrapper = $('#one-up-facebook-wrapper')
    , $stepThreeDestinationWrapper = $('#step-three-destination-wrapper')
    , $stepFourDestinationWrapper = $('#step-four-destination-wrapper')
    , $fbGalleryWrapper = null
    , $gallery = $('.gallery')
    , $usePhoto = $('.use-photo')
    , $closeOneUp = $('.close-one-up')
    , $spin = $('#spin')
    , $overlay = $('#overlay')
    , $photoPipeForm = $('.photoPipeForm')
    , $window = $(window)
    , $document = $(document)
    , _photoToUse = ''
    , _photoDestination = ''
    
  
  // Set some flags for later to see if we are 
  // auth'd for said service or not.
  function checkForAuths(){

    $twitter.isAuthenticated = $twitter.attr('data-auth') === 'true' ? true : false
    $facebook.isAuthenticated = $facebook.attr('data-auth') === 'true' ? true : false
    $instagram.isAuthenticated = $instagram.attr('data-auth') === 'true' ? true : false
    
  }  
  
  // Attach click handlers to respective elements.
  function wireSourceClickHandlers(){

    $twitter.isAuthenticated && $twitter.bind('click', twitterClickHandler)
    $facebook.isAuthenticated && $facebook.bind('click', facebookClickHandler)
    $instagram.isAuthenticated && $instagram.bind('click', instagramClickHandler)
    
  }

  // Attach click handlers to respective elements.
  function wireDestinationClickHandlers(){

    $twitter.isAuthenticated && $twitterDestination.bind('click', twitterDestinationClickHandler)
    $facebook.isAuthenticated && $facebookDestination.bind('click', facebookDestinationClickHandler)
    
    $downloadDestination.bind('click', downloadDestinationClickHandler )
    
  }

  // Attach click handlers to respective elements.
  function wirePaginationButtons(){

    $twitter.isAuthenticated && $twitterLoadMore.bind('click', twitterPaginationClickHandler)
    $facebook.isAuthenticated && $facebookLoadMore.bind('click', facebookPaginationClickHandler)
    $instagram.isAuthenticated && $instagramLoadMore.bind('click', instagramPaginationClickHandler)
    
    
  }


  // Step #1 twitter connection
  function twitterClickHandler(){
    return console.warn('Not Implemented Yet.')
  }
    
  // Step #1 facebook connection
  function facebookClickHandler(e){
    
    // This method will only get called if we are auth'd
    // Fetch photo galleries from facebook
    
    var url = $facebook.attr('href') // /facebook/get_photo_albums

    $
    .get(url)
    .success(function(data, resp){ 
      
      $spin.hide()
      
      // console.dir(data)

      var thumbs = ""
        ,  overall = data.length
      
      // We have to fetch each album image by id via ajax
      $.each(data, function(i,el){
        
        $
        .get('/facebook/get_photo_album_cover?cover_photo='+el.cover_photo)
        .success(function(data){ 

          thumbs += "<div class='inline-block fb-gallery-wrapper'>"+
                      "<img data-album-id='"+el.id+"' src='"+data+"'/>"+
                      "<span class='fb-gallery-label'>"+el.name+"</span>"+
                    "</div>"

          --overall

        })
        .error(function(e){
          --overall 
          alert(e.responseText || "Error") 
        })
        .complete(function(){ 
          
          if(!overall){
            
            $spin.hide()
            // append the gallery thumbs
            $facebookGallery
              .append(thumbs)
              .show()
            
            // Show the photo picker fb section
            $galleryPickerFacebook
              .show()
            
            // Wire up the events to the galleries' containers...
            wireFacebookGalleryGroups()

            // Progress to Step 2
            progressToNextStep($stepOne, function(){

              $stepTwo.slideDown(333)

            })
            
          } // end if !overall
          
        }) // end complete()
        
      }) // end $.each()
      
    })
    .error(function(e,b){
      $spin.hide()
      if(e.status === 400) alert(e.responseText || 'Bad request.')
      if(e.status === 401) alert(e.responseText || 'Unauthorized request.')
      if(e.status === 402) alert(e.responseText || 'Forbidden request.')
      if(e.status === 403) alert(e.responseText || 'Forbidden request.')
      if(e.status === 404) alert(e.responseText || 'Images were not found.')
      if(e.status === 405) alert(e.responseText || 'That method is not allowed.')
      if(e.status === 408) alert(e.responseText || 'The request timed out. Try again.')
      if(e.status === 500) alert(e.responseText || 'Something went really wrong.')
    })
    
    return false
    
  }

  // Step #1 instagram connection
  function instagramClickHandler(){
    
    // This method will only get called if we are auth'd
    // Fetch photos from instagram
    
    var url = $instagram.attr('href') // /instagram/get_user_recent_photos
    
    $
    .get(url)
    .success(function(d, resp){ 
      
      $spin.hide()
      
      // console.dir(d)
      
      // IMPORTANT: The last item in the array is the 
      // pagination object. We must pop it off
      var pageObj = d.pop()
      var nextPageUrl = pageObj.next_url
     
      // Let's update the pagination button with the next 
      // page's URL
      updatePaginationButton($instagramLoadMore, nextPageUrl)

      var thumbs = ""

      // Iterate over the images and add to thumbs string
      d.forEach(function(el,i){
        thumbs += "<img data-standard-resolution='"
                  + el.images.standard_resolution.url
                  +"' src='"+ el.images.thumbnail.url +"' />"
      })

      // Add to photoPicker div
      $oneUpInstagram
        .before(thumbs)
      
      $photoPickerInstagram
        .show()

      // Wire up the events to the images...
      wireInstagramGalleryPicker()

      // Progress to Step 2
      progressToNextStep($stepOne, function(){

        $stepTwo.slideDown(333)

      })

    })
    .error(function(e,b){
      $spin.hide()
      if(e.status === 400) alert(e.responseText || 'Bad request.')
      if(e.status === 401) alert(e.responseText || 'Unauthorized request.')
      if(e.status === 402) alert(e.responseText || 'Forbidden request.')
      if(e.status === 403) alert(e.responseText || 'Forbidden request.')
      if(e.status === 404) alert(e.responseText || 'Images were not found.')
      if(e.status === 405) alert(e.responseText || 'That method is not allowed.')
      if(e.status === 408) alert(e.responseText || 'The request timed out. Try again.')
      if(e.status === 500) alert(e.responseText || 'Something went really wrong.')
    })
    
    // /instagram/get_photos_from_album_id?id='+id
    
    return false
  }
  
  // Twitter pagination handler
  function twitterPaginationClickHandler(){
    return console.warn('Not Implemented Yet.')
  }
    
  // Facebook pagination handler
  function facebookPaginationClickHandler(){
    return console.warn('Not Implemented Yet.')
  }

  // Instagram pagination handler
  // TODO: REFACTOR THIS WITH 'instagramClickHandler' TO BE DRY
  function instagramPaginationClickHandler(){
    
    // In case it is in view
    closeOneUp()    

    var nextPageUrl = $instagramLoadMore.attr('data-pagination') 
    var url = $instagramLoadMore.attr('href') + "?next_page_url=" + encodeURIComponent(nextPageUrl)
    
    $
    .get(url)
    .success(function(d, resp){ 
      
      $spin.hide()

      // console.dir(d)
      
      // IMPORTANT: The last item in the array is the 
      // pagination object. We must pop it off
      var pageObj = d.pop()
      var nextPageUrl = pageObj.next_url
      
      // Let's update the pagination button with the next 
      // page's URL
      updatePaginationButton($instagramLoadMore, nextPageUrl)

      var thumbs = ""

      // Iterate over the images and add to thumbs string
      d.forEach(function(el,i){
        thumbs += "<img data-standard-resolution='"
                  + el.images.standard_resolution.url
                  +"' src='"+ el.images.thumbnail.url +"' />"
      })
      
      // Add moar photos...
      appendPhotosFromPagination(thumbs)
      
      $photoPickerInstagram
        .show()

      // Wire up the events to the images...
      wireInstagramGalleryPicker()

    })
    .error(function(e){
      $spin.hide()
      if(e.status === 400) alert(e.responseText || 'Bad request.')
      if(e.status === 401) alert(e.responseText || 'Unauthorized request.')
      if(e.status === 402) alert(e.responseText || 'Forbidden request.')
      if(e.status === 403) alert(e.responseText || 'Forbidden request.')
      if(e.status === 404) alert(e.responseText || 'Images were not found.')
      if(e.status === 405) alert(e.responseText || 'That method is not allowed.')
      if(e.status === 408) alert(e.responseText || 'The request timed out. Try again.')
      if(e.status === 500) alert(e.responseText || 'Something went really wrong.')
    })
    
    // /instagram/get_photos_from_album_id?id='+id
    
    return false
  }

  // Method that extracts the one up size image to be piped
  function wireFacebookGalleryGroups(){
    
    // stash for later, may need them
    $fbGalleryWrapper = $('.fb-gallery-wrapper') 
    
    $fbGalleryWrapper
      .each(function(i,el){
        $(el).bind('click', wireFacebookGalleryGroupClickHandler)
      }) // end each()
  }

  function wireFacebookGalleryGroupClickHandler(){
    var albumId = $(this).find('img').attr('data-album-id')
    console.log(albumId + " is the albumId")

    // Fetch the images for said gallery
    fetchImagesForFbGallery(albumId)
    
  }
  
  function fetchImagesForFbGallery(id){

    $
    .get('/facebook/get_photos_from_album_id?id='+id)
    .success(function(d, resp, x){ 

      console.dir(d)

      var thumbs = ""

      if(d.message) thumbs += "<p>"+d.message+"</p>"
      else{
        d.data.forEach(function(el,i){
          // console.dir(el)
          thumbs += "<img data-standard-resolution='"+el.images[2].source+"' src='"+el.picture+"' />"
        })
      }

      $oneUpFacebook
        .before(thumbs)
      
      $photoPickerFacebook
        .show()

      $spin
        .hide()
        
      // wire up the images int the fb gallery
      wireFacebookGalleryPicker()  

      progressToNextStep($stepTwo, function(){

        $stepThree.slideDown(333)

      })

    })
    .error(function(e){ 
      if(e.status === 404) alert(e.responseText || 'Images were not found.')
      if(e.status === 403) alert(e.responseText || 'That request was not allowed.')
      if(e.status === 500) alert(e.responseText || 'Something went really wrong.')
    })

  }
  
  // Method that extracts the one up size instagram image to be piped
  function wireInstagramGalleryPicker(){
    
    $photoPickerInstagram
      .find('img')
      .each(function(i,el){
        
        $(el).bind('click', instagramOneUpClickHandler)
        
      }) // end each()
  }

  // Method that extracts the one up size fb image to be piped
  function wireFacebookGalleryPicker(){
    
    $photoPickerFacebook
      .find('img')
      .each(function(i,el){
        
        $(el).bind('click', facebookOneUpClickHandler)
        
      }) // end each()
  }
  
  // Method that handles the one up view (large view) of an image
  function instagramOneUpClickHandler(e){
    
    closeOneUp()    
    
    var standardResUrl = $(e.target).attr('data-standard-resolution') // e.target.dataset.standardResolution
    var img = new Image()

    $spin.show()

    img.src = standardResUrl
    img.onload = function(){
      
      $spin.hide()
      
      $oneUpInstagram
        .prepend(img)
      
      positionFromTop( $photoPickerInstagram, $oneUpInstagram )

      showOverlay()

      $oneUpInstagram
        .find('> .close-one-up:first')
        .show()
        .end()
        .show()
        
    }
    
  }
  
  // Method that handles the one up view (large view) of an image
  function facebookOneUpClickHandler(e){
    closeOneUp()    
    
    var standardResUrl = $(e.target).attr('data-standard-resolution') // e.target.dataset.standardResolution
    var img = new Image()

    $spin.show()

    img.src = standardResUrl
    img.onload = function(){
      
      $spin.hide()
      
      $oneUpFacebook
        .prepend(img)
      
      positionFromTop( $photoPickerFacebook, $oneUpFacebook )

      showOverlay()

      $oneUpFacebook
        .find('> .close-one-up:first')
        .show()
        .end()
        .show()
        
    }
  }
  
  // Method to update the data-pagination value
  // of the 'el' with the 'url' passed in 
  function updatePaginationButton(el, url){
    el.attr('data-pagination', url)
  }
  
  // Helper method to close the One Up View
  function closeOneUp(){
    
    $overlay.hide()

    $('.one-up:visible')
      .hide()
      .find('img:first')
      .remove()
  
  }
  
  // Bind events to the document & close button to 
  // close the one up view
  function wireOneUpHandlers(){
    // Bind ESC key
    $document.bind('keyup', function(e){
      if (e.keyCode === 27) {
        return closeOneUp()
      }
    }) // end keyup
    
    // The "x" button on the one up, close it.
    $closeOneUp.bind('click', closeOneUp )

    // The overlay
    $overlay.bind('click', closeOneUp )
    
  }
  
  // Bind up the click handlers for one-up view
  // when a user selects the photo they want to pipe
  function wireUsePhotoHandlers(){
    
    $usePhoto.bind('click', function(e){
      
      if(e.target.id === 'instagram-use-photo'){

        _photoToUse = $('.one-up:visible').find('img')[0].src
        
        closeOneUp()

        $stepThreeDestinationWrapper.show()
        
        progressToNextStep($stepTwo, function(){

          $stepThree.slideDown(333)

        })
        
      }
       
      if(e.target.id === 'facebook-use-photo'){
        
        // We don't want to show the facebook option, because
        // it is the source of the image.
        $facebookDestination.hide()

        _photoToUse = $('.one-up:visible').find('img')[0].src
        
        closeOneUp()
        
        $stepFourDestinationWrapper.show()

        progressToNextStep($stepThree, function(){

          $stepFour.slideDown(333)

        })

      }
      
      return false

    }) // end bind()
    
  }
  
  // Method to remove current photos in picker view
  // Used during pagination calls
  function appendPhotosFromPagination(imgs){
    
    $gallery
      .find('img:last')
      .after(imgs)
  }
  
  // Step #3 twitter destination
  function twitterDestinationClickHandler(){

    _photoDestination = 'twitter'
    showCaptionForm(_photoDestination)
    
    // console.log(e.target + " is the target")

    toggleEnableChoice(e.target)
    
    return false
  }
    
  // Step #4 facebook destination
  function facebookDestinationClickHandler(e){

    _photoDestination = 'facebook'

    showCaptionForm(_photoDestination)

    // console.log(e.target + " is the target")

    toggleEnableChoice(e.target)
    
    return false
    
  }

  function downloadDestinationClickHandler(e){

    _photoDestination = 'download'

    // showCaptionForm(_photoDestination)

    // console.log(e.target + " is the target")

    toggleEnableChoice(e.target)
    
    pipePhotoPostHandler()
    
    return false
    
  }

  // Wire up the pipe submission form
  function wirePipeForm(){
    $photoPipeForm.bind('submit', pipePhotoPostHandler)
  }
  
  // Post the actual photo and caption
  function pipePhotoPostHandler(){

    $
    .post("/smoke",{
      type: _photoDestination,
      photoUrl: _photoToUse,
      caption: $('#caption').val() 
    })
    .success(function(data){ 

      $spin.hide()

      if(_photoDestination === 'download'){
        // console.dir(data)
        downloadFile(data)
      }
      else{
        // console.dir(data)
        alert('Success!')
        window.location = "/"
      }

    })
    .error(function(e) {
      $spin.hide()
      if(e.status === 400) alert(e.responseText || 'Bad request.')
      if(e.status === 401) alert(e.responseText || 'Unauthorized request.')
      if(e.status === 402) alert(e.responseText || 'Forbidden request.')
      if(e.status === 403) alert(e.responseText || 'Forbidden request.')
      if(e.status === 404) alert(e.responseText || 'Images were not found.')
      if(e.status === 405) alert(e.responseText || 'That method is not allowed.')
      if(e.status === 408) alert(e.responseText || 'The request timed out. Try again.')
      if(e.status === 500) alert(e.responseText || 'Something went really wrong.')
      
      // TODO: RESTART AT STEP ONE? 0N 403 YES.
      if(e.status === 403 && (e.responseText.regexIndexOf(/twitter/gi) > -1)) window.location = "/twitter"
      if(e.status === 403 && (e.responseText.regexIndexOf(/facebook/gi) > -1)) window.location = "/facebook"
      if(e.status === 403 && (e.responseText.regexIndexOf(/instagram/gi) > -1)) window.location = "/instagram"
    })
    
    return false
    
  }


  // Some basic AJAX setup things...
  function ajaxSetup(){
    $.ajaxPrefilter( function( options, originalOptions, jqXHR ){
      $spin.show()
    })
  }
  
  // To be called on AJAX request
  function downloadFile(data){
    
    document.getElementById('downloader').src = '/download/file?filePath=' + data.fullPhotoPath
    toggleEnableChoice()
  }
  
  
  /******************************* UI STUFF *******************************/
  
  // Create spin.js instance
  function spinner(){
    
    var opts = {
      lines: 13, 
      length: 8, 
      width: 2, 
      radius: 10, 
      corners: 1, 
      rotate: 0, 
      color: '#000', 
      speed: 2, 
      trail: 60, 
      shadow: true, 
      hwaccel: true, 
      className: 'spinner', 
      zIndex: 2e9, 
      top: 'auto', 
      left: 'auto' 
    }
    
    var spinner = new Spinner(opts).spin()
    
    $spin
      .append(spinner.el)
      .hide()
    
  }
  
  // Helper method to calculate height of overlay
  // and show it on the screen.
  function showOverlay(){

    $overlay
      .height( $document.height() )
      .show()
    
  }
  
  // Visual cue that item has been picked (source or destination)
  function toggleEnableChoice(el){
    
    $('.selected-destination')
      .removeClass('selected-destination')

    if(!el) return $('#photo-to-pipe li a').removeClass('disabled')
  
    $(el).addClass('selected-destination')
    
    $('#photo-to-pipe li a')
      .not('.selected-destination')
      .addClass('disabled')
    
  }
  
  // TODO: Method that watches position of spinner and will reposition
  // based on scroll. We need it to show up when we scroll down
  function spinnerWatcher(){
    return console.warn("spinnerWatcher() Not implemented yet.")
  }

  // TODO: Method that pages thru photos in one up view.
  // Left arrow button/left swipe goes back
  // Right arrow button/right swip goes forward
  function photoPager(){
    return console.warn("photoPager() Not implemented yet.")
  }
  
  // Show/modify form based on incoming type
  function showCaptionForm(){
    if(_photoDestination === 'facebook'){
      $photoPipeForm.slideDown(333)
    }
    else if(_photoDestination === 'twitter'){
      // TODO: ADD 140 CHAR MAX CHECKER TO CAPTION
      $photoPipeForm.slideDown(333)
    }
    
  }
  
  // Position via offset
  function positionFromTop(container, el){
    
    var containerTop = container.position().top
      , windowTop = $window.scrollTop()
    if(containerTop > windowTop) return el.css('top', 0)
      
    var pos = windowTop - containerTop
    
    return el.css('top', pos)
    
    
  }
  
  // Slide up currentStep
  function progressToNextStep(el,cb){
    el.slideUp(333, cb)
  }
  
  // Initialize...
  (function init(){
    // Order is important here.
    checkForAuths()

    wireSourceClickHandlers()
    wireDestinationClickHandlers()
    wireUsePhotoHandlers()
    wirePaginationButtons()
    wireOneUpHandlers()
    wirePipeForm()

    spinner()
    ajaxSetup()
    
  })()
  
})