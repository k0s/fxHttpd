/**
 * FxHTTPD example 1
 */

function handle(request, response) {
  if (request.method !== "GET") {
    throw HTTP_405;
  }
  response.setStatusLine("1.1", 200, "OK");
  response.setHeader("Content-Type", "text/html; charset=utf-8", false);
  var content = UnicodeConverter("UTF-8").ConvertFromUnicode([
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<title>Hello FxHTTPD</title>',
    '</head>',
    '<body>',
    '<h1>Hello FxHTTPD</h1>',
    '<p>こんにちは</p>',
    '</body>',
    '</html>'
  ].join("\n"));
  response.write(content);
}

