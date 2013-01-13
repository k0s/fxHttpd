
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
  }
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


