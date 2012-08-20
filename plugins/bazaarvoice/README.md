Bazaarvoice Config
=

You will need to do two things:

1. Create a ```bv-config.json``` file in this directory.
2. Inside the file place the following, but put in your credentials
```
{
    "apiversion": "5.2"
  , "passkey": "YOUR_ACTUAL_PASSKEY"
  , "userId": "YOUR_ACTUAL_USERID"
  , "url": "YOUR_ACTUAL_URL"
}
```

3. Find the following code in `routes/index.js`
// So now we just echo it back. Ideally you want to redirect
// it to another service...see below.
res.json(echo)

/******************** PUT PLUGIN HOOKS BELOW HERE **********************/

// For example, to pipe to Bazaarvoice, include it from plugins directory
// var bv = require(path.resolve(__dirname, '..', 'plugins/bazaarvoice/bv.js'))

// Now, just pipe the echo object and be sure to pass the
// response object as well.
// bv.pipeToBv(echo, res)

// IMPORTANT: Since we are passing the 'res' object here, you need
// to comment it out or remove it above (the res.json(echo) line).


/******************** PUT PLUGIN HOOKS ABOVE HERE **********************/
4. Remove or comment out `res.json(echo)`.
5. Uncomment `var bv = require(path.resolve(__dirname, '..', 'plugins/bazaarvoice/bv.js')).`
6. Uncomment `// bv.pipeToBv(echo, res)`