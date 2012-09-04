PhotoPipe Databases
=

Currently, PhotoPipe uses Redis, but I am trying to architect this so that the data store is somewhat pluggable.  Possibly easier said than done.

You will need to place a `redis-config.json` file in this directory with your appropriate config info (so swap out the below values with your own):

{
  "url":"redis://foo:barhashstring@baz.bing.com:9477/",
  "host": "baz.bing.com"
  "port": "9477"
  "auth": "barhashstring"
}