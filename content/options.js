
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "FxHTTPD", "resource://fxhttpd/fxHttpd.js");
XPCOMUtils.defineLazyGetter(this, "bundle", function () {
  return Services.strings.createBundle("chrome://fxhttpd/locale/options.properties");
});

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
function $id (aID) {
  return document.getElementById(aID);
}
function createElement (aTagName, aAttrs, aNS) {
  if (!aNS)
    aNS = XUL_NS;

  var elm = document.createElementNS(XUL_NS, aTagName);
  for (let name of Object.keys(aAttrs)) {
    elm.setAttribute(name, aAttrs[name]);
  }
  return elm;
}

const fxHttpdManager = (function() {
  const FPH = Services.io.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
  const nsFilePicker = Ci.nsIFilePicker;
  var $statusLabel,
      $toggleStartButton,
      $documentRootField,
      $prefDocumentRoot;

  function setStatus (isRunning) {
    if (isRunning) {
      //$statusLabel.value = bundle.GetStringFromName("status.started");
      $statusLabel.value = "Started";
      $statusLabel.className = "started";
      //$toggleStartButton.label = bundle.GetStringFromName("toggleStart.stop.label");
      $toggleStartButton.label = "Stop";
    } else {
      //$statusLabel.value = bundle.GetStringFromName("statusStopped");
      $statusLabel.value = "Stopped";
      $statusLabel.className = "stopped";
      //$toggleStartButton.label = bundle.GetStringFromName("toggleStart.start.label");
      $toggleStartButton.label = "Start";
    }
  }

  var manager = {
    init: function fxHttpdManager_init () {
      $statusLabel = $id("fxhttpd-status");
      $toggleStartButton = $id("fxhttpd-togglestart-button");
      $documentRootField = $id("documentRootField");
      $prefDocumenRoot   = $id("pref-documentRoot");

      Services.obs.addObserver(this, "fxHttpd:status:changed", true);
      setStatus(FxHTTPD.isRunning);
      this.displayDocumentRoot();
      this.onChangeLoopback();
      this.fileHandlers.init();
    },
    toggleStart: function fxHttpdManager_toggleStart () {
      if (FxHTTPD.isRunning) {
        FxHTTPD.stop();
      } else {
        FxHTTPD.start();
      }
    },
    selectDocumentRoot: function fxHttdManager_selectDocumentRoot () {
      var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsFilePicker);
      fp.init(window, bundle.GetStringFromName("filepicker.documentroot.title"), nsFilePicker.modeGetFolder);
      var res = fp.show();
      if (res === nsFilePicker.returnOK) {
        $prefDocumenRoot.value = fp.file;
      }
    },
    displayDocumentRoot: function fxHttpdManager_displayDocumentRoot () {
      var file = $prefDocumenRoot.value;
      if (file) {
        $documentRootField.label = file.path;
        $documentRootField.image = "moz-icon://" + FPH.getURLSpecFromFile(file) + "?size=16";
      }
    },

    onChangeLoopback: function fxHttpdManager_onChangeLoopback () {
      var hostsBox = $id("hostsBox"),
          pref = $id("pref-loopbackOnly");
      hostsBox.collapsed = pref.value;
    },
    
    fileHandlers: {
      init: function () {
        this.prefs = Services.prefs.getBranch("extensions.fxhttpd.fileHandlers.");
        this.rows = $id("fileHandlersRows");
        this.$prefs = $id("prefs");
        for (let handler of FxHTTPD.config.getHandlers("fileHandlers")) {
          this.add(handler);
        }
        this.rows.addEventListener("command", this, false);
      },
      add: function (handler, force) {
        if (!handler)
          handler = {};

        if (!force && !handler.path && !handler.file)
          return;

        var number = this.rows.childNodes.length;
        if (number < handler.number)
          Services.prefs.deleteBranch("extensions.fxhttpd.fileHandlers." + handler.number + ".");


        var prefs = [
          createElement("preference", {
            id: "pref-fileHandler-path-" + number,
            name: "extensions.fxhttpd.fileHandlers." + number + ".path",
            instantApply: "true",
            type: "string"
          }),
          createElement("preference", {
            id: "pref-fileHandler-file-" + number,
            name: "extensions.fxhttpd.fileHandlers." + number + ".file",
            instantApply: "true",
            type: "string"
          }),
        ];
        for (let pref of prefs) {
          this.$prefs.appendChild(pref);
        }

        var item = createElement("row", {
              id: "fileHandler-item-" + number,
              value: number
            }),
            pathContainer = createElement("hbox", { class: "row" }),
            label = createElement("label", { value: "/", class: "path-prefix" }),
            textbox = createElement("textbox", {
              id: "fileHandler-path-" + number,
              flex: "1",
              value: handler.path || "",
              preference: "pref-fileHandler-path-" + number
            }),
            fileContainer = createElement("hbox", { class: "row" }),
            filefield = createElement("textbox", {
              id: "fileHandler-file-" + number,
              flex: "3",
              value: handler.file || "",
              preference: "pref-fileHandler-file-" + number
            }),
            selectButton = createElement("button", {
              label: "Select...",
              rowNum: number,
              value: "select",
            });

        pathContainer.appendChild(label);
        pathContainer.appendChild(textbox);
        fileContainer.appendChild(filefield);
        fileContainer.appendChild(selectButton);
        item.appendChild(pathContainer);
        item.appendChild(fileContainer);
        this.rows.appendChild(item);
        prefs[0].value = textbox.value;
        prefs[1].value = filefield.value;
      },
      handleEvent: function (aEvent) {
        var target = aEvent.target;
        var num = target.getAttribute("rowNum");
        switch (aEvent.target.getAttribute("value")) {
          case "select":
            this.selectFile(num);
            break;
        }

      },
      selectFile: function (rowNum) {
        var fileBox = $id("fileHandler-file-" + rowNum),
            pathBox = $id("fileHandler-path-" + rowNum);
        var file;
        if (fileBox.value) {
          try {
            file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
            file.initWithPath(fileBox.value);
          } catch(e) {
            file = null;
          }
        }
        var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsFilePicker);
        fp.init(window, "Select '/" + pathBox.value + "' handler file", nsFilePicker.modeOpen);
        fp.defaultExtension = "js";
        if (file) {
          if (file.exists()) {
            fp.file = file;
          } else if (file.parent.exists()) {
            fp.displayDirectory = file.parent;
            fp.defaultString = file.leafName;
          }
        } else {
          fp.defaultString = pathBox.value ? pathBox.value + ".js" : "fileHandler-" + number + ".js";
        }
        var res = fp.show();
        if (res === nsFilePicker.returnOK) {
          fileBox.value = $id(fileBox.getAttribute("preference")).valueFromPreferences = fp.file.path;
        }
      },
    },

    observe: function fxHttpdManger_observe (aSubject, aTopic, aData) {
      if (aTopic !== "fxHttpd:status:changed")
        return;
      switch (aData) {
        case "started":
          setStatus(true);
          break;
        case "stopped":
          setStatus(false);
          break;
      }
    },
    QueryInterface: XPCOMUtils.generateQI(["nsIObserver", "nsISupportsWeakReference"]),
  };

  window.addEventListener("DOMContentLoaded", function onload() {
    window.removeEventListener("DOMContentLoaded", onload, false);
    manager.init();
  }, false);

  return manager;
}());

