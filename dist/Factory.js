
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

(function() {
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

}).call(this);
