var _ = require('lodash');
var JSONstringify = require('json-stringify-safe');

/** * @namespace */
var Utils = module.exports;

/**
 *  Generates a JSON-RPC 1.0 or 2.0 request
 *  @param {String} method Name of method to call
 *  @param {Array|Object} params Array of parameters passed to the method as specified, or an object of parameter names and corresponding value
 *  @param {String|Number|null} [id] Request ID can be a string, number, null for explicit notification or left out for automatic generation
 *  @param {Object} [options]
 *  @param {Number} [options.version=2] - JSON-RPC version to use (1 or 2)
 *  @param {Function} [options.generator] - Function that is passed the request, and the options object and is expected to return a request ID
 *  @throws {TypeError} If any of the parameters are invalid
 *  @return {Object} A JSON-RPC 1.0 or 2.0 request
 */
Utils.request = function(method, params, id, options) {
  if(typeof(method) !== 'string') {
    throw new TypeError(method + ' must be a string');
  }

  options = options || {};

  var request = {
    method: method
  };

  // assume that we are doing a 2.0 request unless specified differently
  if(typeof(options.version) === 'undefined' || options.version !== 1) {
    request.jsonrpc = '2.0';
  }

  if(params) {

    // params given, but invalid?
    if(typeof(params) !== 'object' && !Array.isArray(params)) {
      throw new TypeError(params + ' must be an object, array or omitted');
    }

    request.params = params;

  }

  // if id was left out, generate one (null means explicit notification)
  if(typeof(id) === 'undefined') {
    var generator = typeof(options.generator) === 'function' ? options.generator : Utils.generateId;
    request.id = generator(request, options);
  } else {
    request.id = id;
  }

  return request;
};

/**
 *  Generates a JSON-RPC 1.0 or 2.0 response
 *  @param {Object} error Error member
 *  @param {Object} result Result member
 *  @param {String|Number|null} id Id of request
 *  @param {Number} version JSON-RPC version to use
 *  @return {Object} A JSON-RPC 1.0 or 2.0 response
 */
Utils.response = function(error, result, id, version) {
  id = typeof(id) === 'undefined' || id === null ? null : id;
  error = typeof(error) === 'undefined' || error === null ? null : error;
  version = typeof(version) === 'undefined' || version === null ? 2 : version;
  var response = (version === 2) ? { jsonrpc: "2.0", id: id } : { id: id };

  // errors are always included in version 1
  if(version === 1) response.error = error;

  // one or the other with precedence for errors
  if(error) response.error = error;
  else response.result = result;
  return response;
};

/**
 *  Generates a random UUID
 *  @return {String}
 */
Utils.generateId = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

/**
 *  Merges properties of object b into object a
 *  @param {...Object} Objects to be merged
 *  @return {Object}
 *  @private
 */
Utils.merge = function() {
  return _.extend.apply(null, arguments);
};

/**
 *  Determines the parameter names of a function
 *  @param {Function} func
 *  @return {Array}
 *  @private
 */
Utils.getParameterNames = function(func) {
  if(typeof(func) !== 'function') return [];
  var body = func.toString();
  var args = /^(?:function )*.*?\((.+?)\)/.exec(body);
  if(!args) return [];
  var list = (args.pop() || '').split(',');
  return list.map(function(arg) { return arg.trim(); });
};

/** * @namespace */
Utils.JSON = {};

/**
 * Parses a JSON string and then invokes the given callback
 * @param {String} str The string to parse
 * @param {Object} options Object with options, possibly holding a "reviver" function
 */
Utils.JSON.parse = function(str, options, callback) {
  var reviver = null;
  var obj = null;
  options = options || {};

  if(_.isFunction(options.reviver)) {
    reviver = options.reviver;
  }

  try {
    obj = JSON.parse.apply(JSON, _.compact([str, reviver]));
  } catch(err) {
    return callback(err);
  }

  callback(null, obj);
};

/**
 * Stringifies JSON and then invokes the given callback
 * @param {Object} obj The object to stringify
 * @param {Object} options Object with options, possibly holding a "replacer" function
 */
Utils.JSON.stringify = function(obj, options, callback) {
  var replacer = null;
  var str = null;
  options = options || {};

  if(_.isFunction(options.replacer)) {
    replacer = options.replacer;
  }

  try {
    str = JSONstringify.apply(JSON, _.compact([obj, replacer]));
  } catch(err) {
    return callback(err);
  }

  callback(null, str);
};

/** * @namespace */
Utils.Request = {};

/**
 * Determines if the passed request is a batch request
 * @param {Object} request The request
 * @return {Boolean}
 */
Utils.Request.isBatch = function(request) {
  return Array.isArray(request);
};

/**
 * Determines if the passed request is a notification request
 * @param {Object} request The request
 * @return {Boolean}
 */
Utils.Request.isNotification = function(request) {
  return Boolean(
    request
    && !Utils.Request.isBatch(request)
    && (typeof(request.id) === 'undefined'
         || request.id === null)
  );
};

/**
 * Determines if the passed request is a valid JSON-RPC 2.0 Request
 * @param {Object} request The request
 * @return {Boolean}
 */
Utils.Request.isValidVersionTwoRequest = function(request) {
  return Boolean(
    request
    && typeof(request) === 'object'
    && request.jsonrpc === '2.0'
    && typeof(request.method) === 'string'
    && (
      typeof(request.params) === 'undefined'
      || Array.isArray(request.params)
      || (request.params && typeof(request.params) === 'object')
    )
    && (
      typeof(request.id) === 'undefined'
      || typeof(request.id) === 'string'
      || typeof(request.id) === 'number'
      || request.id === null
    )
  );
};

/**
 * Determines if the passed request is a valid JSON-RPC 1.0 Request
 * @param {Object} request The request
 * @return {Boolean}
 */
Utils.Request.isValidVersionOneRequest = function(request) {
  return Boolean(
    request
    && typeof(request) === 'object'
    && typeof(request.method) === 'string'
    && Array.isArray(request.params)
    && typeof(request.id) !== 'undefined'
  );
};

/**
 * Determines if the passed request is a valid JSON-RPC Request
 * @param {Object} request The request
 * @param {Number} version JSON-RPC version 1 or 2
 * @return {Boolean}
 */
Utils.Request.isValidRequest = function(request, version) {
  version = version === 1 ? 1 : 2;
  return Boolean(
    request
    && (
      (version === 1 && Utils.Request.isValidVersionOneRequest(request)) ||
      (version === 2 && Utils.Request.isValidVersionTwoRequest(request))
    )
  );
};

/** * @namespace */
Utils.Response = {};

/**
 * Determines if the passed error is a valid JSON-RPC error response
 * @param {Object} error The error
 * @param {Number} version JSON-RPC version 1 or 2
 * @return {Boolean}
 */
Utils.Response.isValidError = function(error, version) {
  version = version === 1 ? 1 : 2;
  return Boolean(
    version === 1 && (
      typeof(error) !== 'undefined'
      && error !== null
    )
    || version === 2 && (
      error
      && typeof(error.code) === 'number'
      && parseInt(error.code, 10) === error.code
      && typeof(error.message) === 'string'
    )
  );
};
