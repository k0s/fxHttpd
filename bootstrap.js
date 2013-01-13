
const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;
Cu.import("resource://gre/modules/Services.jsm");

const resourceHandler = Services.io.getProtocolHandler("resource")
                                   .QueryInterface(Ci.nsIResProtocolHandler);
const resourceName = "fxhttpd";
var FxHTTPD;

/*
 * aReason:
 *  APP_STARTUP:     1
 *  APP_SHUTDOWN:    2
 *  ADDON_ENABLE:    3
 *  ADDON_DISABLE:   4
 *  ADDON_INSTALL:   5
 *  ADDON_UNINSTALL: 6
 *  ADDON_UPGRADE:   7
 *  ADDON_DOWNGRADE: 8
 */
function install (aData, aReason) {
  Services.console.logStringMessage("fxHttpd: installed: " + aReason);
  var rootURI = aData.resourceURI.spec;
  setDefaultPrefs(rootURI + "/defaults/preferences/prefs.js");
}
function startup (aData, aReason) {
  Services.console.logStringMessage("fxHttpd: startup: " + aReason);
  var resourceURI = Services.io.newURI(aData.resourceURI.spec + "/modules/", null, null);
  resourceHandler.setSubstitution(resourceName, resourceURI);
  Cu.import("resource://fxhttpd/fxHttpd.js");
  FxHTTPD.init();
}
function shutdown (aData, aReasoon) {
  Services.console.logStringMessage("fxHttpd: shutdown: " + aReasoon);
  if (FxHTTPD) {
    FxHTTPD.destroy();
  }
  FxHTTPD = null;
  Cu.unload("resource://fxhttpd/fxHttpd.js");
  resourceHandler.setSubstitution(resourceName, null);
}
function uninstall (aData, aReason) {
  Services.console.logStringMessage("fxHttpd: uninstalled: " + aReason);
  if (aReason === ADDON_UNINSTALL) {
    Services.prefs.deleteBranch("extensions.fxhttpd");
  }
}

function setDefaultPrefs (url) {
  const branch = Services.prefs.getDefaultBranch("");
  var sandbox = {
    pref: function (key, value) {
      if (branch.prefHasUserValue(key))
        return;

      switch (typeof value) {
        case "boolean":
          branch.setBoolPref(key, value);
          break;
        case "number":
          branch.setIntPref(key, value);
          break;
        case "string":
          branch.setCharPref(key, value);
          break;
      }
    }
  };
  Services.scriptloader.loadSubScript(url, sandbox);
}

