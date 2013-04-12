/**
 * @fileOverview /markdown
 * @example
 * $> cat <<EOM | curl -X POST --data-urlencode "file@-" http://localhost:8090/markdown
 * title
 * =====
 *
 *  * foo
 *  * bar
 * EOM
 */

const PAGEDOWN_FILE = "Markdown.Converter.js";
const MARKDOWN_FILE = "markdown.html";

Object.defineProperty(this, "markdownConverter", {
  get: function () {
    var tmp = {};
    console.log("[/markdown]", "load", PAGEDOWN_FILE);
    loadScript("./" + PAGEDOWN_FILE, tmp);
    var converter = new tmp.Markdown.Converter();
    Object.defineProperty(this, "markdownConverter", {
      value: converter,
      enumrable:true,
      configurable: true
    });
    return converter;
  },
  configurable: true,
});

var currentTab = null;

function getTab () {
  if (currentTab)
    return currentTab;

  var uri = fileToURI(getFile("./" + MARKDOWN_FILE));
  console.log("[/markdown]", "getTab:", uri.spec);
  var tab = getRecentWindow().gBrowser.loadOneTab(uri.spec, { inBackground: false });
  tab.addEventListener("TabClose", function onTabClose() {
    tab.removeEventListener("TabClose", onTabClose, false);
    currentTab = null;
  }, false);
  return currentTab = tab;
}

function handle(request, response) {
  var markdownHTML = "";
  var title = "Markdown";
  switch (request.method) {
    case "POST": {
      console.log("[/markdown]", "handle POST");
      let data = "";
      let query = new RequestQuery(request);
      let fileField = query.get("file", null);
      if (fileField) {
        data = fileField.toString("UTF-8");
      }
      if (data)
        markdownHTML = markdownConverter.makeHtml(data);

      let browser = getTab().linkedBrowser;
      let doc = browser.contentDocument;
      if (doc.readyState === "complete") {
        doc.body.innerHTML = markdownHTML;
      } else {
        browser.addEventListener("DOMContentLoaded", function onload() {
          browser.removeEventListener("DOMContentLoaded", onload, false);
          console.log("LoadingTab: is ready");
          browser.contentDocument.body.innerHTML = markdownHTML;
        }, false);
      }
      console.log("[/markdown]", "handle POST done");
    }
    // DONT break;
    case "GET": {
      console.log("[/markdown]", "handle GET");
      if (!currentTab)
        throw HTTP_404;

      let doc = currentTab.linkedBrowser.contentDocument;
      response.setStatusLine(request.httpVersion, 200, "OK");
      response.setHeader("Content-Type", "text/html", false);
      let body = [
        '<!DOCTYPE html>',
        '<html xmlns="http://www.w3.org/1999/xhtml">',
        '<head><meta charset="utf-8"/><title>' + title + '</title></head>',
        '<body>',
        markdownHTML || doc.body.innerHTML,
        '</body>',
        '</html>', ''
      ].join("\n");

      response.write(UnicodeConverter("UTF-8").ConvertFromUnicode(body));
    }
    break;
    case "DELETE": {
      console.log("[/markdown]", "hendle DELETE");
      response.setStatusLine(request.httpVersion, 202, "Accepted");
      if (currentTab) {
        console.warn("close tab");
        currentTab.ownerDocument.defaultView.gBrowser.removeTab(currentTab);
        currentTab = null;
      }
    }
    break;
    default:
      throw HTTP_404;
  }
  console.log("[/markdown] handled END");
}


