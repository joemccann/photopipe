Instagram PhotoPipe Plugin
=

This is READ ONLY from instagram.  Their API doesn't support posting directly to instagram. 

0. Create your app with instagram:  http://instagram.com/developer/clients/manage/
1. Create your `instagram-config.json`.  It needs to contain:
{"client_id":"YOUR_KEY","client_secret":"YOUR_SECRET","redirect_uri":"YOUR_REDIRECT_URI"}
2. Create a route in index.js for the oauth piece.
3. Create a route for the `redirect_uri` in index.js as well.
4. Install the instagram node module `npm i instagram-node-lib`