(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (definition) {
  if (typeof exports === "object") {
    module.exports = definition();
  }
  else if (typeof define === 'function' && define.amd) {
    define(definition);
  }
  else {
    window.BackboneExtend = definition();
  }
})(function () {
  "use strict";
  
  // mini-underscore
  var _ = {
    has: function (obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    },
  
    extend: function(obj) {
      for (var i=1; i<arguments.length; ++i) {
        var source = arguments[i];
        if (source) {
          for (var prop in source) {
            obj[prop] = source[prop];
          }
        }
      }
      return obj;
    }
  };

  /// Following code is pasted from Backbone.js ///

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Expose the extend function
  return extend;
});

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var Deferred, PENDING, REJECTED, RESOLVED, VERSION, after, execute, flatten, has, installInto, isArguments, isPromise, wrap, _when,
    __slice = [].slice;

  VERSION = '3.0.0';

  PENDING = "pending";

  RESOLVED = "resolved";

  REJECTED = "rejected";

  has = function(obj, prop) {
    return obj != null ? obj.hasOwnProperty(prop) : void 0;
  };

  isArguments = function(obj) {
    return has(obj, 'length') && has(obj, 'callee');
  };

  isPromise = function(obj) {
    return has(obj, 'promise') && typeof (obj != null ? obj.promise : void 0) === 'function';
  };

  flatten = function(array) {
    if (isArguments(array)) {
      return flatten(Array.prototype.slice.call(array));
    }
    if (!Array.isArray(array)) {
      return [array];
    }
    return array.reduce(function(memo, value) {
      if (Array.isArray(value)) {
        return memo.concat(flatten(value));
      }
      memo.push(value);
      return memo;
    }, []);
  };

  after = function(times, func) {
    if (times <= 0) {
      return func();
    }
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  wrap = function(func, wrapper) {
    return function() {
      var args;
      args = [func].concat(Array.prototype.slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  execute = function(callbacks, args, context) {
    var callback, _i, _len, _ref, _results;
    _ref = flatten(callbacks);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      callback = _ref[_i];
      _results.push(callback.call.apply(callback, [context].concat(__slice.call(args))));
    }
    return _results;
  };

  Deferred = function() {
    var candidate, close, closingArguments, doneCallbacks, failCallbacks, progressCallbacks, state;
    state = PENDING;
    doneCallbacks = [];
    failCallbacks = [];
    progressCallbacks = [];
    closingArguments = {
      'resolved': {},
      'rejected': {},
      'pending': {}
    };
    this.promise = function(candidate) {
      var pipe, storeCallbacks;
      candidate = candidate || {};
      candidate.state = function() {
        return state;
      };
      storeCallbacks = function(shouldExecuteImmediately, holder, holderState) {
        return function() {
          if (state === PENDING) {
            holder.push.apply(holder, flatten(arguments));
          }
          if (shouldExecuteImmediately()) {
            execute(arguments, closingArguments[holderState]);
          }
          return candidate;
        };
      };
      candidate.done = storeCallbacks((function() {
        return state === RESOLVED;
      }), doneCallbacks, RESOLVED);
      candidate.fail = storeCallbacks((function() {
        return state === REJECTED;
      }), failCallbacks, REJECTED);
      candidate.progress = storeCallbacks((function() {
        return state !== PENDING;
      }), progressCallbacks, PENDING);
      candidate.always = function() {
        var _ref;
        return (_ref = candidate.done.apply(candidate, arguments)).fail.apply(_ref, arguments);
      };
      pipe = function(doneFilter, failFilter, progressFilter) {
        var filter, master;
        master = new Deferred();
        filter = function(source, funnel, callback) {
          if (!callback) {
            return candidate[source](master[funnel]);
          }
          return candidate[source](function() {
            var args, value;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            value = callback.apply(null, args);
            if (isPromise(value)) {
              return value.done(master.resolve).fail(master.reject).progress(master.notify);
            } else {
              return master[funnel](value);
            }
          });
        };
        filter('done', 'resolve', doneFilter);
        filter('fail', 'reject', failFilter);
        filter('progress', 'notify', progressFilter);
        return master;
      };
      candidate.pipe = pipe;
      candidate.then = pipe;
      if (candidate.promise == null) {
        candidate.promise = function() {
          return candidate;
        };
      }
      return candidate;
    };
    this.promise(this);
    candidate = this;
    close = function(finalState, callbacks, context) {
      return function() {
        if (state === PENDING) {
          state = finalState;
          closingArguments[finalState] = arguments;
          execute(callbacks, closingArguments[finalState], context);
          return candidate;
        }
        return this;
      };
    };
    this.resolve = close(RESOLVED, doneCallbacks);
    this.reject = close(REJECTED, failCallbacks);
    this.notify = close(PENDING, progressCallbacks);
    this.resolveWith = function(context, args) {
      return close(RESOLVED, doneCallbacks, context).apply(null, args);
    };
    this.rejectWith = function(context, args) {
      return close(REJECTED, failCallbacks, context).apply(null, args);
    };
    this.notifyWith = function(context, args) {
      return close(PENDING, progressCallbacks, context).apply(null, args);
    };
    return this;
  };

  _when = function() {
    var def, defs, finish, resolutionArgs, trigger, _i, _len;
    defs = flatten(arguments);
    if (defs.length === 1) {
      if (isPromise(defs[0])) {
        return defs[0];
      } else {
        return (new Deferred()).resolve(defs[0]).promise();
      }
    }
    trigger = new Deferred();
    if (!defs.length) {
      return trigger.resolve().promise();
    }
    resolutionArgs = [];
    finish = after(defs.length, function() {
      return trigger.resolve.apply(trigger, resolutionArgs);
    });
    defs.forEach(function(def, index) {
      if (isPromise(def)) {
        return def.done(function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          resolutionArgs[index] = args.length > 1 ? args : args[0];
          return finish();
        });
      } else {
        resolutionArgs[index] = def;
        return finish();
      }
    });
    for (_i = 0, _len = defs.length; _i < _len; _i++) {
      def = defs[_i];
      isPromise(def) && def.fail(trigger.reject);
    }
    return trigger.promise();
  };

  installInto = function(fw) {
    fw.Deferred = function() {
      return new Deferred();
    };
    fw.ajax = wrap(fw.ajax, function(ajax, options) {
      var createWrapper, def, promise, xhr;
      if (options == null) {
        options = {};
      }
      def = new Deferred();
      createWrapper = function(wrapped, finisher) {
        return wrap(wrapped, function() {
          var args, func;
          func = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          if (func) {
            func.apply(null, args);
          }
          return finisher.apply(null, args);
        });
      };
      options.success = createWrapper(options.success, def.resolve);
      options.error = createWrapper(options.error, def.reject);
      xhr = ajax(options);
      promise = def.promise();
      promise.abort = function() {
        return xhr.abort();
      };
      return promise;
    });
    return fw.when = _when;
  };

  if (typeof exports !== 'undefined') {
    exports.Deferred = function() {
      return new Deferred();
    };
    exports.when = _when;
    exports.installInto = installInto;
  } else if (typeof define === 'function' && define.amd) {
    define(function() {
      if (typeof Zepto !== 'undefined') {
        return installInto(Zepto);
      } else {
        Deferred.when = _when;
        Deferred.installInto = installInto;
        return Deferred;
      }
    });
  } else if (typeof Zepto !== 'undefined') {
    installInto(Zepto);
  } else {
    this.Deferred = function() {
      return new Deferred();
    };
    this.Deferred.when = _when;
    this.Deferred.installInto = installInto;
  }

}).call(this);

},{}],4:[function(require,module,exports){

/*
FactoryJS is distributed under the following license:
-----------------------------------------------------

The MIT License (MIT)

Copyright (c) 2013, 2014 Lookout Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */
'use strict';
var Factory, dfd, events, extend,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

dfd = require('simply-deferred').Deferred;

events = require('events');

extend = require('backbone-extend-standalone');

module.exports = Factory = (function(_super) {
  var extendMixinOptions, _compact, _each, _extend, _omit, _toArray, _uniq;

  __extends(Factory, _super);

  _extend = function() {
    var k, obj, objects, target, v, _i, _len;
    target = arguments[0], objects = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      obj = objects[_i];
      for (k in obj) {
        v = obj[k];
        target[k] = v;
      }
    }
    return target;
  };

  _uniq = function(arr) {
    var output, v, _i, _len;
    output = [];
    for (_i = 0, _len = arr.length; _i < _len; _i++) {
      v = arr[_i];
      if (-1 === output.indexOf(v)) {
        output.push(v);
      }
    }
    return output;
  };

  _compact = function(arr) {
    var output, v, _i, _len;
    output = [];
    for (_i = 0, _len = arr.length; _i < _len; _i++) {
      v = arr[_i];
      if (v) {
        output.push(v);
      }
    }
    return output;
  };

  _each = function(input, cb) {
    var k, v, _i, _len, _results, _results1;
    if (input instanceof Array) {
      _results = [];
      for (_i = 0, _len = input.length; _i < _len; _i++) {
        v = input[_i];
        _results.push(cb(v));
      }
      return _results;
    } else {
      _results1 = [];
      for (k in input) {
        v = input[k];
        _results1.push(cb(v, k));
      }
      return _results1;
    }
  };

  _omit = function() {
    var input, k, omissions, output, v, _i, _len;
    input = arguments[0], omissions = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    output = null;
    if (input instanceof Array) {
      output = [];
      for (_i = 0, _len = input.length; _i < _len; _i++) {
        v = input[_i];
        if (__indexOf.call(omissions, v) < 0) {
          output.push(v);
        }
      }
    } else {
      output = {};
      for (k in input) {
        v = input[k];
        if (__indexOf.call(omissions, k) < 0) {
          output[k] = v;
        }
      }
    }
    return output;
  };

  _toArray = function(input) {
    var k, output, v;
    output = [];
    if (!input) {
      return output;
    }
    if (input instanceof Array) {
      return input.slice();
    }
    for (k in input) {
      v = input[k];
      output.push(v);
    }
    return output;
  };

  extendMixinOptions = function(mixinOptions, mixinDefaults) {
    var defaultValue, isObject, option, value, _isElement;
    if (mixinOptions == null) {
      mixinOptions = {};
    }
    if (mixinDefaults == null) {
      mixinDefaults = {};
    }
    _isElement = function(obj) {
      return (obj != null ? obj.nodeType : void 0) === 1;
    };
    for (option in mixinDefaults) {
      defaultValue = mixinDefaults[option];
      value = mixinOptions[option] != null ? mixinOptions[option] : mixinOptions[option] = defaultValue;
      isObject = typeof value === 'object' || typeof defaultValue === 'object';
      if (!isObject) {
        continue;
      }
      if (value instanceof Date || defaultValue instanceof Date || _isElement(value || _isElement(defaultValue || typeof value === 'function' || typeof defaultValue === 'function' || value instanceof RegExp || defaultValue instanceof RegExp))) {
        continue;
      }
      if (value instanceof Array || defaultValue instanceof Array) {
        mixinOptions[option] = value.concat(defaultValue);
        continue;
      }
      mixinOptions[option] = _extend({}, defaultValue, value);
    }
  };

  function Factory(Base, options) {
    if (options == null) {
      options = {};
    }
    this.mixins = {};
    this.mixinSettings = {};
    this.tagCbs = {};
    this.tagMap = {};
    this.promises = {};
    this.instances = {};
    this.definitions = {};
    this.define('Base', Base || function() {
      return this;
    });
    this.baseTags = options.baseTags || [];
    this.on('create', this.handleCreate, this);
  }

  Factory.prototype.define = function(name, def, options) {
    var definition, message, tags, _base;
    if (options == null) {
      options = {};
    }
    if ((this.definitions[name] != null) && !options.override) {
      if (options.silent) {
        return this;
      }
      message = "Definition already exists :: " + name + " :: user overide option to ignore";
      throw new Error(message);
    }
    if ((_base = this.promises)[name] == null) {
      _base[name] = dfd();
    }
    definition = {
      options: options
    };
    if (!(def && typeof def.extend === 'function')) {
      def.extend = extend;
    }
    if (typeof def === 'function') {
      definition.constructor = def;
    } else {
      definition.constructor = function() {
        return _extend({}, def);
      };
    }
    definition.constructor.prototype.__factory = (function(_this) {
      return function() {
        return _this;
      };
    })(this);
    tags = [name].concat(options.tags).concat(this.baseTags);
    definition.tags = _uniq(_compact(tags));
    this.instances[name] = [];
    _each(definition.tags, (function(_this) {
      return function(tag) {
        _this.tagMap[tag] = _this.tagMap[tag] || [];
        return _this.tagCbs[tag] = _this.tagCbs[tag] || [];
      };
    })(this));
    this.definitions[name] = definition;
    this.emit('define', name, definition, options);
    this.promises[name].resolve(this, name);
    return this;
  };

  Factory.prototype.hasDefinition = function(name) {
    return Boolean(this.definitions[name]);
  };

  Factory.prototype.whenDefined = function(name) {
    var _base;
    return (_base = this.promises)[name] != null ? _base[name] : _base[name] = dfd();
  };

  Factory.prototype.fetchDefinition = function(name, module) {
    var callback, promise;
    if (module == null) {
      module = name;
    }
    promise = this.whenDefined(name);
    callback = (function(_this) {
      return function(def) {
        if (!_this.hasDefinition(name)) {
          return _this.define(name, def);
        }
      };
    })(this);
    if (typeof define === 'function' && define.amd) {
      require([module], callback);
    } else {
      callback(require(module));
    }
    return promise;
  };

  Factory.prototype.extend = function(base, name, def, options) {
    var bDef, mixinDefaults, mixinOptions, mixins, tags;
    if (options == null) {
      options = {};
    }
    bDef = this.definitions[base];
    if (!bDef) {
      throw new Error("Base Class Not Available :: " + base);
    }
    if (typeof def !== 'object') {
      throw new Error("Invalid Parameter Definition ::\nexpected object ::\ngot " + (def.constructor.prototype.toString()));
    }
    tags = [].concat(options.tags).concat(bDef.tags);
    options.tags = _uniq(_compact(tags));
    if (options.inheritMixins) {
      mixins = [].concat(bDef.options.mixins).concat(options.mixins);
      options.mixins = _uniq(_compact(mixins));
      mixinOptions = def.mixinOptions;
      mixinDefaults = bDef.constructor.prototype.mixinOptions;
      extendMixinOptions(mixinOptions, mixinDefaults);
    }
    if (options.singleton != null) {
      options.singleton = options.singleton;
    } else {
      options.singleton = bDef.options.singleton;
    }
    return this.define(name, bDef.constructor.extend(def), options);
  };

  Factory.prototype.clone = function(factory) {
    var singletonDefinitions;
    if (!(factory instanceof Factory)) {
      throw new Error('Invalid Argument :: Expected Factory');
    }
    singletonDefinitions = [];
    _each(["definitions", "mixins", "promises", "mixinSettings"], (function(_this) {
      return function(key) {
        _this[key] = _extend({}, factory[key], _this[key]);
        if (key === 'definitions') {
          return _each(_this[key], function(def, defname) {
            if (def.options.singleton) {
              singletonDefinitions.push(defname);
            }
            return _this[key][defname].constructor.prototype.__factory = function() {
              return _this;
            };
          });
        }
      };
    })(this));
    return _each(["tagCbs", "tagMap", "promises", "instances"], (function(_this) {
      return function(key) {
        var name, payload, singleton, _base, _base1, _ref, _results;
        if (_this[key] == null) {
          _this[key] = {};
        }
        _ref = factory[key];
        _results = [];
        for (name in _ref) {
          payload = _ref[name];
          if (key === 'instances' && __indexOf.call(singletonDefinitions, name) >= 0) {
            singleton = true;
          }
          if (payload instanceof Array) {
            if ((_base = _this[key])[name] == null) {
              _base[name] = [];
            }
            if (singleton) {
              _this[key][name] = _this[key][name];
            } else {
              _this[key][name] = payload.concat(_this[key][name]);
            }
          }
          if (payload && typeof payload.resolve === 'function') {
            if ((_base1 = _this[key])[name] == null) {
              _base1[name] = dfd();
            }
            _results.push(_this[key][name].done(payload.resolve));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };
    })(this));
  };

  Factory.prototype.mirror = function(factory) {
    factory.removeListener('create', factory.handleCreate);
    _each(this, (function(_this) {
      return function(member, memberName) {
        if (typeof member !== 'function') {
          return;
        }
        return factory[memberName] = function() {
          return _this[memberName].apply(_this, arguments);
        };
      };
    })(this));
    this.clone(factory);
    return _each(factory, function(member, memberName) {
      if (typeof member === 'function') {
        return;
      }
      return delete factory[memberName];
    });
  };

  Factory.prototype.defineMixin = function(name, def, options) {
    if (options == null) {
      options = {};
    }
    if ((this.mixins[name] != null) && !options.override) {
      throw new Error("Mixin already defined :: " + name + " :: use override option to ignore");
    }
    this.mixins[name] = def;
    this.mixinSettings[name] = options;
    this.emit('defineMixin', name, def, options);
    return this;
  };

  Factory.prototype.composeMixinDependencies = function(mixins) {
    var deps, mixin, result, _i, _len;
    if (mixins == null) {
      mixins = [];
    }
    result = [];
    for (_i = 0, _len = mixins.length; _i < _len; _i++) {
      mixin = mixins[_i];
      deps = this.mixinSettings[mixin].mixins || [];
      result = result.concat(this.composeMixinDependencies(deps));
      result.push(mixin);
    }
    return _uniq(result);
  };

  Factory.prototype.composeMixinOptions = function(instance, mixinName, args) {
    var mixin, mixinDefaults, mixinOptions;
    mixin = this.mixins[mixinName];
    mixinDefaults = mixin.mixinOptions;
    mixinOptions = instance.mixinOptions;
    extendMixinOptions(mixinOptions, mixinDefaults);
    if (typeof mixin.mixconfig === "function") {
      mixin.mixconfig.apply(mixin, [mixinOptions].concat(__slice.call(args)));
    }
    return instance.mixinOptions = _extend({}, mixinDefaults, mixinOptions);
  };

  Factory.prototype.applyMixin = function(instance, mixinName) {
    var ignore_tags, late_mix, mixin, mixinSettings, props;
    mixin = this.mixins[mixinName];
    if (!mixin) {
      throw new Error("Mixin Not Defined :: " + mixinName);
    }
    if (!instance.____mixed) {
      late_mix = true;
      ignore_tags = true;
      instance.____mixed = [];
    }
    if (__indexOf.call(instance.____mixed, mixinName) >= 0) {
      return;
    }
    mixinSettings = this.mixinSettings[mixinName];
    if (mixinSettings.tags && !ignore_tags) {
      instance.____tags || (instance.____tags = []);
      instance.____tags = instance.____tags.concat(mixinSettings.tags);
    }
    props = _omit(mixin, 'mixinOptions', 'mixinitialize', 'mixconfig');
    _extend(instance, props);
    if (late_mix) {
      this.mixinitialize(instance, mixinName);
      delete instance.____mixed;
    } else {
      instance.____mixed.push(mixinName);
    }
    return instance;
  };

  Factory.prototype.mixinitialize = function(instance, mixinName) {
    var mixin, mixinitialize;
    mixin = this.mixins[mixinName];
    mixinitialize = mixin.mixinitialize;
    if (typeof mixinitialize === 'function') {
      return mixinitialize.call(instance);
    }
  };

  Factory.prototype.handleMixins = function(instance, mixins, args) {
    var mixinName, resolvedMixins, reverseMixins, _i, _j, _k, _len, _len1, _len2;
    instance.____mixed = [];
    instance.mixinOptions = _extend({}, instance.mixinOptions);
    resolvedMixins = this.composeMixinDependencies(mixins);
    instance.__mixins = function() {
      return resolvedMixins.slice();
    };
    for (_i = 0, _len = resolvedMixins.length; _i < _len; _i++) {
      mixinName = resolvedMixins[_i];
      this.applyMixin(instance, mixinName);
    }
    reverseMixins = resolvedMixins.slice().reverse();
    for (_j = 0, _len1 = reverseMixins.length; _j < _len1; _j++) {
      mixinName = reverseMixins[_j];
      this.composeMixinOptions(instance, mixinName, args);
    }
    for (_k = 0, _len2 = resolvedMixins.length; _k < _len2; _k++) {
      mixinName = resolvedMixins[_k];
      this.mixinitialize(instance, mixinName);
    }
    instance.__mixin = ((function(_this) {
      return function(instance) {
        return function(mixin, mixinOptions) {
          instance.____mixed = [];
          _this.handleMixins(instance, [mixin], mixinOptions);
          return delete instance.____mixed;
        };
      };
    })(this))(instance);
    return delete instance.____mixed;
  };

  Factory.prototype.handleInjections = function(instance, injections) {
    var name, type, _results;
    _results = [];
    for (name in injections) {
      type = injections[name];
      _results.push(instance[name] = this.get(type));
    }
    return _results;
  };

  Factory.prototype.handleCreate = function(instance) {
    var cb, cbs, tag, _i, _j, _len, _len1, _ref;
    _ref = instance.__tags();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      tag = _ref[_i];
      if (this.tagCbs[tag] == null) {
        this.tagCbs[tag] = [];
      }
      cbs = this.tagCbs[tag];
      if (cbs.length === 0) {
        continue;
      }
      for (_j = 0, _len1 = cbs.length; _j < _len1; _j++) {
        cb = cbs[_j];
        if (typeof cb === 'function') {
          cb(instance);
        }
      }
    }
    return true;
  };

  Factory.prototype.handleTags = function(name, instance, tags) {
    var factoryMap, fullTags, tag, _i, _len;
    this.instances[name].push(instance);
    fullTags = _toArray(tags).concat(instance.____tags || []);
    if (instance.____tags) {
      delete instance.____tags;
    }
    instance.__tags = function() {
      return _toArray(fullTags);
    };
    factoryMap = [this.instances[name]];
    for (_i = 0, _len = fullTags.length; _i < _len; _i++) {
      tag = fullTags[_i];
      if (this.tagMap[tag] == null) {
        this.tagMap[tag] = [];
      }
      this.tagMap[tag].push(instance);
      factoryMap.push(this.tagMap[tag]);
    }
    factoryMap = _uniq(factoryMap);
    return instance.__factoryMap = function() {
      return [].slice.call(factoryMap);
    };
  };

  Factory.prototype.get = function() {
    var args, constructor, def, injections, instance, instances, message, mixins, name, options, singleton, _base;
    name = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    instances = (_base = this.instances)[name] != null ? _base[name] : _base[name] = [];
    instance = this.instances[name][0];
    def = this.definitions[name];
    message = "Invalid Definition :: " + name + " :: not defined";
    if (def == null) {
      throw new Error(message);
    }
    constructor = def.constructor;
    options = def.options || {};
    singleton = !!options.singleton;
    mixins = options.mixins || [];
    injections = options.injections || [];
    if (singleton && instance) {
      return instance;
    }
    instance = (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(constructor, args, function(){});
    instance.__type = function() {
      return name;
    };
    instance.constructor = this.getConstructor(name);
    this.handleMixins(instance, mixins, args);
    this.handleInjections(instance, injections);
    this.handleTags(name, instance, def.tags);
    if (typeof instance.constructed === 'function') {
      instance.constructed.apply(instance, args);
    }
    instance.__dispose = (function(factory) {
      return function() {
        return factory.dispose(this);
      };
    })(this);
    this.emit('create', instance);
    return instance;
  };

  Factory.prototype.verifyTags = function(instance) {
    var arr, _i, _len, _ref;
    if (!instance.__factoryMap) {
      return false;
    }
    _ref = instance.__factoryMap();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      arr = _ref[_i];
      if (__indexOf.call(arr, instance) < 0) {
        return false;
      }
    }
    return true;
  };

  Factory.prototype.dispose = function(instance) {
    _each(instance.__factoryMap(), function(arr) {
      var message, _results;
      message = "Instance Not In Factory :: " + instance + " :: disposal failed!";
      if (__indexOf.call(arr, instance) < 0) {
        throw new Error(message);
      }
      _results = [];
      while (arr.indexOf(instance) > -1) {
        _results.push(arr.splice(arr.indexOf(instance), 1));
      }
      return _results;
    });
    return this.emit('dispose', instance);
  };

  Factory.prototype.getConstructor = function(name, original) {
    var result;
    if (original == null) {
      original = false;
    }
    if (original) {
      return this.definitions[name].constructor;
    }
    result = ((function(_this) {
      return function(name) {
        return function() {
          return _this.get.apply(_this, [name].concat(__slice.call(arguments)));
        };
      };
    })(this))(name);
    result.prototype = this.definitions[name].constructor.prototype;
    return result;
  };

  Factory.prototype.onTag = function(tag, cb) {
    var instance, message, _base, _i, _len, _ref;
    message = "Invalid Argument :: " + (typeof tag) + " provided :: expected String";
    if (typeof tag !== 'string') {
      throw new Error(message);
    }
    message = "Invalid Argument :: " + (typeof cb) + " provided :: expected Function";
    if (typeof cb !== 'function') {
      throw new Error(message);
    }
    _ref = this.tagMap[tag] || [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      instance = _ref[_i];
      cb(instance);
    }
    if ((_base = this.tagCbs)[tag] == null) {
      _base[tag] = [];
    }
    this.tagCbs[tag].push(cb);
    return true;
  };

  Factory.prototype.offTag = function(tag, cb) {
    var cbIdx, message;
    message = "Invalid Argument :: " + (typeof tag) + " provided :: expected String";
    if (typeof tag !== 'string') {
      throw new Error(message);
    }
    if (this.tagCbs[tag] == null) {
      return;
    }
    if (typeof cb !== 'function') {
      this.tagCbs[tag] = [];
      return;
    }
    cbIdx = this.tagCbs[tag].indexOf(cb);
    message = "Callback Not Found :: " + cb + " :: for tag " + tag;
    if (cbIdx === -1) {
      throw new Error(message);
    }
    return this.tagCbs[tag].splice(cbIdx, 1);
  };

  Factory.prototype.isType = function(instance, type) {
    return instance.__type() === type;
  };

  Factory.prototype.getType = function(instance) {
    return instance.__type();
  };

  return Factory;

})(events.EventEmitter);



},{"backbone-extend-standalone":1,"events":2,"simply-deferred":3}]},{},[4]);