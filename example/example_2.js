/**
 * FxHTTPD example 2
 *
 * list keys and values of query
 */

function handle(request, response) {
  var query = new RequestQuery(request);

  try {
  var list = ['<dl>'];
  for (let [key, queryData] of query) {
    list.push('<dt>' + key + '</dt><dd>' + escapeHTML(queryData.toString("Shift_JIS")) + '</dd>');
  }
  } catch(e) {
    list = [e.message];
  }
  list.push('</dl>');
  response.setStatusLine("1.1", 200, "OK");
  response.setHeader("Content-Type", "text/html; charset=utf-8", false);
  var content = UnicodeConverter("UTF-8").ConvertFromUnicode([
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<title>List Queries</title>',
    '</head>',
    '<body>',
    '<h1>List Queries</h1>',
    list.join(""),
    '</body>',
    '</html>'
  ].join("\n"));
  response.write(content);
}

