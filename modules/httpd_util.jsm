
const EXPORTED_SYMBOLS = [
  "escapeHTML",
  "UnicodeConverter",
  "RequestQuery",
];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;

function escapeHTML (text) {
  return text.replace(/[<>&]/g, function(char) {
    switch (char) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      default:  return char;
    }
  });
}
// CC (contractID, interfaceName [, initializer]) {{{1
/**
 * @description fix Component.Constructor
 * @param {String} contractID
 * @param {String} interfaceName
 * @param {String|Function} initializer
 * @return {Functioin}
 */
function CC (contractID, interfaceName, initializer) {
  return function ComponentsConstructor () {
    var instance = Cc[contractID].createInstance(Ci[interfaceName]);
    if (initializer) {
      switch (typeof initializer) {
        case "string":
          instance[initializer].apply(instance, arguments);
          break;
        case "function":
          initializer.apply(instance, arguments);
          break;
        default:
          throw new TypeError("Bad initializer");
      }
    }
    return instance;
  }
} // 1}}}

const BinaryInputStream = CC("@mozilla.org/binaryinputstream;1", "nsIBinaryInputStream", "setInputStream");
const UnicodeConverter  = CC("@mozilla.org/intl/scriptableunicodeconverter", "nsIScriptableUnicodeConverter",
                           function (charset) { this.charset = charset; });

// == Request body parser == {{{1
// =============================================================================
const CRLF = "\r\n";
// Class RequestQuery (Request::request) {{{2
/**
 * @Constructor
 * @param {Request} request
 */
function RequestQuery (request) {
  this.request = request;
  this.data = new Map;
  this.parse(request);
}
RequestQuery.prototype = {
  // void::parse ([Request::req]) {{{3
  parse: function RQ_parse (req) {
    if (!req)
      req = this.request;

    var queryString = req.queryString,
        contentLength = req.hasHeader("Content-Length") ?
                        parseInt(req.getHeader("Content-Length"), 10) :
                        0,
        contentType;
    if (queryString)
      this._setFormURLEncoded(queryString);

    if (contentLength <= 0)
      return;
    if (!req.hasHeader("Content-Type"))
      throw HTTP_400;

    contentType = new HeaderValue("Content-Type", req.getHeader("Content-Type"));
    switch (contentType.value) {
      case "multipart/form-data": {
        let boundary = contentType.metadata.boundary;
        if (!boundary)
          throw HTTP_400;
        return this._setMultipartFormData(this._getInputData(contentLength), boundary);
      }
      case "application/x-www-form-urlencoded":
        return this._setFormURLEncoded(this._getInputData(contentLength));
      default:
        throw HTTP_400;
    }
  }, // 3}}}
  // String::getData (any::key [, any::defaultValue]) {{{3
  getData: function RQ_getData (key, defaultValue) {
    return this.data.has(key) ? this.data.get(key).data : defaultValue;
  }, // 3}}}
  // any::get (any::key [, any:defaultValue]) {{{3
  get: function RQ_get (key, defaultValue) {
    return this.data.has(key) ? this.data.get(key) : null;
  }, // 3}}}
  // void::set (any::key,  any:value) {{{3
  set: function RQ_set (key, value) {
    return this.data.set(key, value);
  }, // 3}}}
  // Boolean::has (any::key) {{{3
  has: function RQ_has (key) {
    return this.data.has(key);
  }, // 3}}}
  // Boolean::delete (any::key) {{{3
  delete: function RQ_delete(key) {
    return this.data.delete(key);
  }, // 3}}}
  // Number::getter length {{{3
  get length () {
    return this.data.size();
  }, // 3}}}
  // Iterator::iterator () {{{3
  iterator: function RQ_iterator () {
    return this.m.iterator();
  }, // 3}}}
  // String::_getInputData ([Number::count]) {{{3
  _getInputData: function RQ__getInputData (count) {
    var input = this.request.bodyInputStream,
        bis;
    try {
      bis = BinaryInputStream(input);
      if (count == null)
        length = bis.available();

      return (count > 0) ? bis.readBytes(count) : "";
    } catch (e) {
      throw e;
    } finally {
      bis.close();
    }
  }, // 3}}}
  // Map::_setMultipartFormData (String:buffer, String::boundary) {{{3
  _setMultipartFormData: function RQ__setMultipartFormData(buffer, boundary) {
    var currentField,
        index = 0;
    boundary = "--" + boundary;
    const len = boundary.length;

    while (true) {
      // START
      let index = buffer.indexOf(boundary);
      if (index !== 0 ||
          buffer.substr(len, 2) === "--")
        break;

      buffer = buffer.substr(len + 2);
      currentField = new RequestBodyField(true);
      // HEADER
      index = buffer.indexOf(CRLF + CRLF);
      currentField.setHeaders(buffer.substr(0, index).split(CRLF));
      if (currentField.name) {
        this.data.set(currentField.name, currentField);
      } else {
        this.data.set(index++, currentField);
      }
      buffer = buffer.substr(index + 4);
      // BODY
      index = buffer.indexOf(CRLF + boundary);
      currentField.data = buffer.substr(0, index);
      buffer = buffer.substr(index + 2);
      // CHECK END
      if (buffer.startsWith(boundary + "--")) {
        break;
      }
    }
    return this.data;
  }, // 3}}}
  // Map::_setFormURLEncoded (String::buffer) {{{3
  _setFormURLEncoded: function RQ__setFormURLEncoded(buffer) {
    for (let keyValue of buffer.split("&")) {
      let pos = keyValue.indexOf("=");
      if (pos === -1)
        this.data.set(keyValue, new RequestBodyField(false, keyValue));
      else {
        let key = keyValue.substr(0, pos),
            value = keyValue.substr(pos + 1);
        this.data.set(key, new RequestBodyField(false, key, value));
      }
    }
    return this.data;
  }, // 3}}}
}; // 2}}}
// Class HeaderValue (String::name, String::data) {{{2
/**
 * @Constructor
 * @param {String} name
 * @param {String} data
 */
function HeaderValue (name, data) {
  this.name = name;
  this.value = "";
  this.metadata = {};
  this.parse(data);
}
HeaderValue.prototype = {
  // void::parse (String::data) {{{3
  parse: function HV_parse (data) {
    data = data.trim();
    var res = {},
        values = data.split(/;\s*/);
    this.value = values[0] || "";
    for (let i = 1, len = values.length; i < len; ++i) {
      let data = values[i];
      let index = data.indexOf("=");
      if (index === -1)
        continue;

      let key = data.substr(0, index).toLowerCase(),
          value = data.substr(index + 1).trim();
      switch (value.charAt(0)) {
        case "\"":
        case "'":
          value = value.slice(1, -1);
          break;
      }
      this.metadata[key] = value;
    }
  }, // 3}}}
  // String::toString () {{{3
  toString: function HV_toString() {
    var str = [this.name + ": " + this.value];
    for (let key in this.metadata) {
      str.push(key + "=" + this.metadata[key].quote());
    }
    return str.join("; ");
  }, // 3}}}
};
// 2}}}
// Class RequestBodyField (Boolean::isFormData [, String::name, String::data]) {{{2
/** 
 * @Constructor
 * @param {Boolean} isFormData
 * @param {String} [name]
 * @param {String} [data]
 */
function RequestBodyField (isFormData, name, data) {
  this.name = name || "";
  this._data = "";
  this.isFormData = !!isFormData;
  if (data)
    this.data = data;
}
RequestBodyField.prototype = {
  // ReponseBodyField's default properties {{{3
  contentType: "application/octetstream",
  fileName: "",
  // 3}}}
  // String::getter data {{{3
  get data() {
    return this._data;
  }, // 3}}}
  // String::setter data {{{3
  set data(val) {
    if (!this.isFormData) {
      val = decodeURIComponent(val);
    }
    return this._data = val;
  }, // 3}}}
  // void::setHeaders (String::lines) {{{3
  setHeaders: function RBF_setHeaders (lines) {
    if (!Array.isArray(lines)) {
      if (typeof lines === "string")
        lines = lines.split(CRLF);
      else
        throw new TypeError("lines mult be Array or string");
    }
    for (var i = 0, len = lines.length; i < len; ++i)
      this._parseHeader(lines[i]);
  }, // 3}}}
  // void::_parseHeader (String::line) {{{3
  _parseHeader: function RBF__parseHeader (line) {
    if (!this.isFormData)
      return;
    line = line.trim();
    var pos = line.indexOf(":");
    if (pos === -1)
      return;

    var headerName = line.substr(0, pos).trim(),
        lowerHeaderName = headerName.toLowerCase(),
        headerValue = line.substr(pos + 1);

    if (lowerHeaderName in this._headerHandlers) {
      this._headerHandlers[lowerHeaderName].call(this, new HeaderValue(headerName, headerValue));
    }
  }, // 3}}}
  // Object::_headerHandlers {{{3
  _headerHandlers: {
    "content-disposition": function (aHeaderValue) {
      var m = aHeaderValue.metadata;
      if ("name" in m)
        this.name = m.name;
      if ("filename" in m)
        this.fileName = m.filename;
    },
    "content-type": function (aHeaderValue) {
      var m = aHeaderValue.metadata;
      this.contentType = aHeaderValue.value;
      if ("charset" in m)
        this.charset = m.charset;
    },
  }, // 3}}}
  // String::toString ([String::charset]) {{{3
  toString: function RBF_toString (charset) {
    charset = charset || this.charset || "";
    if (charset)
      return UnicodeConverter(charset).ConvertToUnicode(this._data);

    return this._data;
  }, // 3}}}
};
// 2}}}
// 1}}}

// vim: sw=2 ts=2 et ft=javascript fdm=marker:
