
const EXPORTED_SYMBOLS = ["FxHTTPD"];
const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://fxhttpd/httpd.js");
Cu.import("resource://fxhttpd/httpd_util.jsm");

const SERVER_CONFIG = {
  prefs: Services.prefs.getBranch("extensions.fxhttpd."),
  get: function (key, defaultValue) {
    switch (this.prefs.getPrefType(key)) {
      case this.prefs.PREF_STRING:
        return this.prefs.getComplexValue(key, Ci.nsISupportsString).data;
      case this.prefs.PREF_INT:
        return this.prefs.getIntPref(key);
      case this.prefs.PREF_BOOL:
        return this.prefs.getBoolPref(key);
      default:
        return defaultValue;
    }
  },
  getHandlers: function (name) {
    name += ".";
    var prefs = Services.prefs.getBranch("extensions.fxhttpd." + name);
    var i = 1;
    var childList = prefs.getChildList(i + ".");
    while (childList.length > 0) {
      let res = {
        number: i,
      };
      for (let child of childList) {
        let key = child.substr(("" + i).length + 1);
        res[key] = prefs.getComplexValue(child, Ci.nsISupportsString).data;
      }
      yield res;
      childList = prefs.getChildList((++i) + ".");
    }
  },
};

const FxHTTPD = {
  httpd: null,
  config: SERVER_CONFIG,

  init: function () {
    if (SERVER_CONFIG.get("autoStart", false)) {
      this.start();
    }
  },
  destroy: function () {
    this.stop();
    this.httpd = null;
    Cu.unload("resource://fxhttpd/httpd.js");
    Cu.unload("resource://fxhttpd/httpd_util.jsm");
  },
  get isRunning() {
    if (this.httpd) {
      return !this.httpd._socketClosed;
    }
    return false;
  },
  start: function() {
    var port = SERVER_CONFIG.get("port", 8090),
        loopbackOnly = SERVER_CONFIG.get("loopbackOnly", true),
        hosts = SERVER_CONFIG.get("hosts", ""),
        documentRoot = SERVER_CONFIG.get("documentRoot", "");

    this.httpd = new HttpServer();

    if (documentRoot) {
      let dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
      dir.initWithPath(documentRoot);
      if (dir.exists() && dir.isDirectory()) {
        this.httpd.registerDirectory("/", dir);
      }
    }
    if (hosts) {
      for (let host of hosts.split(/\s*,\s*/)) {
        this.httpd._identity.add("http", host, port);
      }
    }
    this.registerPathHandlers();

    this.httpd.start(port, loopbackOnly);
    Services.obs.notifyObservers(null, "fxHttpd:status:changed", "started");
  },
  stop: function () {
    if (this.isRunning) {
      this.httpd.stop(function() {
        Services.console.logStringMessage("fxhttpd: server stopped.");
        Services.obs.notifyObservers(null, "fxHttpd:status:changed", "stopped");
      });
    }
  },
  registerPathHandlers: function () {
    var now = Date.now();
    for (let handler of SERVER_CONFIG.getHandlers("fileHandlers")) {
      if (!handler.path || !handler.file)
        continue;

      try {
        let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
        file.initWithPath(handler.file);
        let context = new ScriptContext(file);
        this.httpd.registerPathHandler("/" + handler.path, context);
      } catch (e) {
        Cu.reportError(e);
      }
    }
  },
};

/**
 * @class
 * @param {nsIFIle} aFile
 */
function ScriptContext (aFile) {
  if (!aFile.exists())
    throw new Error("NotFound: " + aFile.path);

  if (!aFile.isFile())
    throw new Error("IsNotFile: " + aFile.path);

  var now = Date.now(),
      uri = Services.io.newFileURI(aFile);
  Object.defineProperties(this, {
    __FILE__: {
      get: function () {
        return aFile.clone();
      },
      enumerable: true,
    },
  });
  Services.scriptloader.loadSubScript(uri.spec + "?" + now, this, "utf-8");
}
ScriptContext.prototype = {
  /**
   * dummy handler (Should define in the {aFile})
   * @param {HttpReqest} aRequest
   * @param {HttpResponse} aResponse
   */
  handle: function SC_dumy_handler (aRequest, aResponse) {
    throw new HTTP_501;
  },
  /**
   * @getter
   * @return {Window}
   */
  get recentWindow () {
    return Services.wm.getMostRecentWindow("navigator:browser");
  },
};

