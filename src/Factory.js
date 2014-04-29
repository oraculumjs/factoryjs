(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  define(["underscore", "jquery", "backbone"], function(_, $, Backbone) {
    var Factory, extendMixinOptions;
    extendMixinOptions = function(mixinOptions, mixinDefaults) {
      var defaultValue, isObject, option, value, _results;
      if (mixinOptions == null) {
        mixinOptions = {};
      }
      if (mixinDefaults == null) {
        mixinDefaults = {};
      }
      _results = [];
      for (option in mixinDefaults) {
        defaultValue = mixinDefaults[option];
        value = mixinOptions[option] != null ? mixinOptions[option] : mixinOptions[option] = defaultValue;
        isObject = _.isObject(value) || _.isObject(defaultValue);
        if (!isObject) {
          continue;
        }
        if (_.isDate(value) || _.isDate(defaultValue) || _.isElement(value) || _.isElement(defaultValue) || _.isFunction(value) || _.isFunction(defaultValue) || _.isRegExp(value) || _.isRegExp(defaultValue)) {
          continue;
        }
        if (_.isArray(value) || _.isArray(defaultValue)) {
          mixinOptions[option] = value.concat(defaultValue);
          continue;
        }
        _results.push(mixinOptions[option] = _.extend({}, defaultValue, value));
      }
      return _results;
    };
    return Factory = (function() {
      _.extend(Factory.prototype, Backbone.Events);

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
        this.define('Base', Base);
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
          _base[name] = $.Deferred();
        }
        definition = {
          options: options
        };
        if (!_.isFunction(def.extend)) {
          def.extend = Backbone.Model.extend;
        }
        if (_.isFunction(def)) {
          definition.constructor = def;
        } else {
          definition.constructor = function() {
            return _.clone(def);
          };
        }
        definition.constructor.prototype.__factory = (function(_this) {
          return function() {
            return _this;
          };
        })(this);
        tags = [name].concat(options.tags).concat(this.baseTags);
        definition.tags = _.uniq(tags).filter(function(i) {
          return !!i;
        });
        this.instances[name] = [];
        _.each(definition.tags, (function(_this) {
          return function(tag) {
            _this.tagMap[tag] = _this.tagMap[tag] || [];
            return _this.tagCbs[tag] = _this.tagCbs[tag] || [];
          };
        })(this));
        this.definitions[name] = definition;
        this.trigger('define', name, definition, options);
        this.promises[name].resolve(this, name);
        return this;
      };

      Factory.prototype.hasDefinition = function(name) {
        return !!this.definitions[name];
      };

      Factory.prototype.whenDefined = function(name) {
        var _base;
        if ((_base = this.promises)[name] == null) {
          _base[name] = $.Deferred();
        }
        return this.promises[name].promise();
      };

      Factory.prototype.fetchDefinition = function(name) {
        var dfd;
        dfd = this.whenDefined(name);
        require([name], (function(_this) {
          return function(def) {
            return _this.define(name, def);
          };
        })(this));
        return dfd;
      };

      Factory.prototype.extend = function(base, name, def, options) {
        var bDef, mixinDefaults, mixinOptions;
        if (options == null) {
          options = {};
        }
        bDef = this.definitions[base];
        if (!bDef) {
          throw new Error("Base Class Not Available :: " + base);
        }
        if (!_.isObject(def)) {
          throw new Error("Invalid Parameter Definition ::\nexpected object ::\ngot " + (def.constructor.prototype.toString()));
        }
        options.tags = _.chain([]).union(options.tags).union(bDef.tags).compact().value();
        if (options.inheritMixins) {
          options.mixins = _.chain([]).union(bDef.options.mixins).union(options.mixins).compact().value();
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
        var message, singletonDefinitions;
        message = "Invalid Argument :: Expected Factory";
        if (!(factory instanceof Factory)) {
          throw new Error(message);
        }
        singletonDefinitions = [];
        _.each(["definitions", "mixins", "promises", "mixinSettings"], (function(_this) {
          return function(key) {
            _.defaults(_this[key], factory[key]);
            if (key === 'definitions') {
              return _.each(_this[key], function(def, defname) {
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
        return _.each(["tagCbs", "tagMap", "promises", "instances"], (function(_this) {
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
              if (_.isArray(payload)) {
                if ((_base = _this[key])[name] == null) {
                  _base[name] = [];
                }
                if (singleton) {
                  _this[key][name] = _this[key][name];
                } else {
                  _this[key][name] = payload.concat(_this[key][name]);
                }
              }
              if (_.isFunction(payload != null ? payload.resolve : void 0)) {
                if ((_base1 = _this[key])[name] == null) {
                  _base1[name] = $.Deferred();
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
        factory.off('create', factory.handleCreate);
        _.chain(this).methods().each((function(_this) {
          return function(method) {
            return factory[method] = function() {
              return _this[method].apply(_this, arguments);
            };
          };
        })(this));
        this.clone(factory);
        return _.chain(factory).keys().each(function(key) {
          if (!_.isFunction(factory[key])) {
            return delete factory[key];
          }
        });
      };

      Factory.prototype.defineMixin = function(name, def, options) {
        var message;
        if (options == null) {
          options = {};
        }
        if ((this.mixins[name] != null) && !options.override) {
          message = "Mixin already defined :: " + name + " :: use override option to ignore";
          throw new Error(message);
        }
        this.mixins[name] = def;
        this.mixinSettings[name] = options;
        this.trigger('defineMixin', name, def, options);
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
        return _.uniq(result);
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
        return instance.mixinOptions = _.extend({}, mixinDefaults, mixinOptions);
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
        props = _.omit(mixin, 'mixinOptions', 'mixinitialize', 'mixconfig');
        _.extend(instance, props);
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
        if (_.isFunction(mixinitialize)) {
          return mixinitialize.call(instance);
        }
      };

      Factory.prototype.handleMixins = function(instance, mixins, args) {
        var mixinName, resolvedMixins, reverseMixins, _i, _j, _k, _len, _len1, _len2;
        instance.____mixed = [];
        instance.mixinOptions = _.extend({}, instance.mixinOptions);
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
        instance.__mixin = _.chain(function(obj, mixin, mixinOptions) {
          obj.____mixed = [];
          this.handleMixins(obj, [mixin], mixinOptions);
          return delete obj.____mixed;
        }).bind(this).partial(instance).value();
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
            if (_.isFunction(cb)) {
              cb(instance);
            }
          }
        }
        return true;
      };

      Factory.prototype.handleTags = function(name, instance, tags) {
        var factoryMap, fullTags, tag, _i, _len;
        this.instances[name].push(instance);
        fullTags = _.toArray(tags).concat(instance.____tags || []);
        if (instance.____tags) {
          delete instance.____tags;
        }
        instance.__type = function() {
          return name;
        };
        instance.__tags = function() {
          return _.toArray(fullTags);
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
        factoryMap = _.uniq(factoryMap);
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
        this.handleMixins(instance, mixins, args);
        this.handleInjections(instance, injections);
        this.handleTags(name, instance, def.tags);
        if (_.isFunction(instance.constructed)) {
          instance.constructed.apply(instance, args);
        }
        instance.__dispose = (function(factory) {
          return function() {
            return factory.dispose(this);
          };
        })(this);
        this.trigger('create', instance);
        return instance;
      };

      Factory.prototype.verifyTags = function(instance) {
        if (!instance.__factoryMap) {
          return false;
        }
        return _.all(instance.__factoryMap(), function(arr) {
          return __indexOf.call(arr, instance) >= 0;
        });
      };

      Factory.prototype.dispose = function(instance) {
        _.each(instance.__factoryMap(), function(arr) {
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
        return this.trigger('dispose', instance);
      };

      Factory.prototype.getConstructor = function(name, original) {
        var result;
        if (original == null) {
          original = false;
        }
        if (original) {
          return this.definitions[name].constructor;
        }
        result = _.chain(this.get).bind(this).partial(name).value();
        result.prototype = this.definitions[name].constructor.prototype;
        return result;
      };

      Factory.prototype.onTag = function(tag, cb) {
        var instance, message, _base, _i, _len, _ref;
        message = "Invalid Argument :: " + (typeof tag) + " provided :: expected String";
        if (!_.isString(tag)) {
          throw new Error(message);
        }
        message = "Invalid Argument :: " + (typeof cb) + " provided :: expected Function";
        if (!_.isFunction(cb)) {
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
        if (!_.isString(tag)) {
          throw new Error(message);
        }
        if (this.tagCbs[tag] == null) {
          return;
        }
        if (!_.isFunction(cb)) {
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

    })();
  });

}).call(this);
