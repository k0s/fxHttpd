fxHttpd
=======

HTTP Server for Firefox Addon

The base code is [httd.js][httpdjs] which is used for tests of HTTP server and client in Mozilla.

![options view](http://cache.gyazo.com/b240be3b586b4418c7f44f37adef4cdf.png)

How to build
------------

    $ make xpi

File Handlers
--------------

like CGI, you can write response handler.

example)

    function handle (request, response) {
      response.setStatusLine("1.1", 200, "OK");
      response.setHeader("Content-Type", "text/html", false);
      var body = [
        '<!DOCTYPE html>',
        '<html>',
        '<head><meta charset="utf-8"/><title>Hello World</title></head>',
        '<body>',
        '<h1>Hello FxHTTPD</h1>',
        '</body>',
        '</html>',
      ].join("\n");
      response.write(body);
    }

`handle` function must be required.

for more detail, see [wiki]'s [How to pathhandlers][pathHandlers]

LICENSE
-------

 * [MPL 2.0][MPL2.0]

[httpdjs]: http://mxr.mozilla.org/mozilla-central/source/netwerk/test/httpserver/httpd.js
[MPL2.0]: http://www.mozilla.org/MPL/2.0/
[wiki]: https://github.com/teramako/fxHttpd/wiki
[pathHandlers]: https://github.com/teramako/fxHttpd/wiki/How-to-pathhandlers

