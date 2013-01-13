
const EXPORTED_SYMBOLS = ["FxHTTPD"];
const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

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
    Cu.import("resource://fxhttpd/httpd.js", this);
    Services.console.logStringMessage("FxHTTPD: module loaded");
    if (SERVER_CONFIG.get("autoStart", false)) {
      this.start();
    }
  },
  destroy: function () {
    this.stop();
    this.httpd = null;
    Cu.unload("resource://fxhttpd/httpd.js");
  },
  get isRunning() {
    if (this.httpd) {
      return !this.httpd._socketClosed;
    }
    return false;
  },
  start: function() {
    var port = SERVER_CONFIG.get("port", 8090),
        documentRoot = SERVER_CONFIG.get("documentRoot", "");

    this.httpd = new this.HttpServer();

    if (documentRoot) {
      let dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
      dir.initWithPath(documentRoot);
      if (dir.exists() && dir.isDirectory()) {
        this.httpd.registerDirectory("/", dir);
      }
    }
    this.registerPathHandlers();

    this.httpd.start(port);
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
        if (file.exists() && file.isFile()) {
          let uri = Services.io.newFileURI(file);
          let tmp = {};
          Services.scriptloader.loadSubScript(uri.spec + "?" + now, tmp, "utf-8");
          this.httpd.registerPathHandler("/" + handler.path, tmp);
        }
      } catch (e) {
        Cu.reportError(e);
      }
    }
  },
};

const Observer = {
  observe: function (aSubject, aTopic, aData) {
    switch (aTopic) {
      case "nsPref:changed":
        switch (aData) {
          case "extensions.fxhttpd.started":
            Services.console.logStringMessage("changed: fxhttpd started: " + SERVER_CONFIG.get("started"));
            break;
        }
        break;
    }
  },
  QueryInterface: XPCOMUtils.generateQI(["nsIObserver", "nsISupportsWeakReference"]),
};


