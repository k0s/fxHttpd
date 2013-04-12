/**
 * eject CD drive
 * for [fxHttpd](https://github.com/teramako/fxHttpd)
 *
 * Windows, Linux
 *  http://localhost:8090/eject?path={path}
 *
 * Darwin
 *  http://localhost:8090/eject
 */
function handle (request, response) {
  var OS = Services.appinfo.OS;
  response.setHeader("Content-Type", "text/html; charset=utf-8", false);

  // see: https://developer.mozilla.org/en-US/docs/OS_TARGET
  switch (OS) {
    case "WINNT":
    case "Linux":
      var query = new RequestQuery(request);
      var path = query.getData("path", null);
      if (!path) {
        response.setStatusLine("1.1", 400, "Bad Request");
        response.write([
          '<!DOCTYPE html>',
          '<html>',
          '<head><title>"path" query parameter is required</title></head>',
          '<body>',
          '<h1>400 Bad Request</h1>',
          '<p>"path" query parameter is required</p>',
          '</body>',
          '</html>'
        ].join("\n"));
        return;
      }
      // don't break;
    case "Darwin":
      response.setStatusLine(request.httpVersion, 200, "OK");
      try {
        var ret = eject[OS](path);
      } catch (e) {
        ret = e.message;
      }
      response.write([
        '<!DOCTYPE html>',
        '<html>',
        '<head><title>eject ' + path + '</title></head>',
        '<body>',
        '<h1>eject ' + path + '</h1>',
        '<p>ret = ' + ret + '</p>',
        '</body>',
        '</html>'
      ].join("\n"));
      break;
    default:
      response.setStatusLine(request.httpVersion, 501, "Not Implemented");
      response.write([
        '<!DOCTYPE html>',
        '<html>',
        '<head><title>sorry ' + OS + ' is not supported</title></head>',
        '<body>',
        '<h1>Unknown OS</h1>',
        '<p>sorry ' + OS + ' is not supported</p>',
        '</body>',
        '</html>'
      ].join("\n"));
  }
}


Object.defineProperty(this, "ctypes", {
  get: function () {
    var tmp = {};
    Components.utils.import("resource://gre/modules/ctypes.jsm", tmp);
    Object.defineProperty(this, "ctypes", { value: tmp.ctypes });
    return tmp.ctypes;
  },
  configurable: true,
});

const eject = {
  "WINNT": function ejectWin (path) {
    const UINT = ctypes.unsigned_int,
          DWORD = ctypes.uint32_t,
          LPCWSTR = ctypes.jschar.ptr,
          WinABI = ctypes.size_t.size === 8 ? ctypes.default_abi : ctypes.winapi_abi;

    const dll = "winmm.dll";

    var winmm = ctypes.open(dll);
    var mciSendStringW = winmm.declare("mciSendStringW", WinABI, DWORD, LPCWSTR, DWORD, UINT, DWORD);
    path = path.charAt(0);
    var driveName = path.toLowerCase() + "_drive";
    mciSendStringW("open " + path + ": type cdaudio alias " + driveName, 0, 0, 0);
    return mciSendStringW("set " + driveName + " door open", 0, 0, 0);
  },
  "Darwin": function ejectMac () {
    return runProcess("/usr/bin/drutil", ["tray", "eject"]);
  },
  "Linux": function ejectLinux (path) {
    var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    file.initWithPath(path);
    if (!file.exists() || !file.isDirectory())
      throw new Error(path + " is not directory");

    return runProcess("/usr/bin/eject", [path]);
  },
};

function runProcess (path, args) {
  var exe = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  exe.initWithPath(path);
  if (!exe.exists())
    throw new Error(path + " is not found");
  if (!exe.isExecutable())
    throw new Error(path + " is not executable");

  var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
  process.init(exe);
  process.run(true, args, args.length);
  return process.exitValue;
}

// vim: set sw=2 ts=2 et:
