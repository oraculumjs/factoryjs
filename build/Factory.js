(function() {
  var __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  define(["underscore", "jquery", "backbone"], function(_, $, Backbone) {
    var Factory;
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
        var bDef, message;
        if (options == null) {
          options = {};
        }
        bDef = this.definitions[base];
        message = "Base Class Not Available :: " + base;
        if (!bDef) {
          throw new Error(message);
        }
        message = "Invalid Parameter Definition ::\nexpected object ::\ngot " + (def.constructor.prototype.toString());
        if (!_.isObject(def)) {
          throw new Error(message);
        }
        options.tags = [].concat(bDef.tags, options.tags);
        return this.define(name, bDef.constructor.extend(def), options);
      };

      Factory.prototype.clone = function(factory) {
        var message;
        message = "Invalid Argument :: Expected Factory";
        if (!(factory instanceof Factory)) {
          throw new Error(message);
        }
        return _.each(["definitions", "mixins", "promises", "mixinSettings"], (function(_this) {
          return function(key) {
            _.defaults(_this[key], factory[key]);
            if (key === 'definitions') {
              return _.each(_this[key], function(def, defname) {
                return _this[key][defname].constructor.prototype.__factory = function() {
                  return _this;
                };
              });
            }
          };
        })(this));
      };

      Factory.prototype.mirror = function(factory) {
        this.clone(factory);
        factory.on('define', (function(_this) {
          return function(name, def, options) {
            return _this.define(name, def.constructor, _.extend({
              silent: true
            }, options));
          };
        })(this));
        return factory.on('defineMixin', this.defineMixin, this);
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
        var defaultValue, isArray, isObject, mixin, mixinDefaults, mixinOptions, option, value;
        mixin = this.mixins[mixinName];
        mixinOptions = instance.mixinOptions;
        mixinDefaults = mixin.mixinOptions || {};
        for (option in mixinDefaults) {
          defaultValue = mixinDefaults[option];
          value = mixinOptions[option];
          if (value === void 0) {
            value = defaultValue;
          }
          isArray = _.isArray(value) || _.isArray(defaultValue);
          isObject = _.isObject(value) || _.isObject(defaultValue);
          if (isArray) {
            mixinOptions[option] = value.concat(defaultValue);
          }
          if (isObject) {
            mixinOptions[option] = _.extend({}, defaultValue, value);
          }
        }
        if (_.isFunction(mixin.mixconfig)) {
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
        var resolvedMixins;
        instance.____mixed = [];
        instance.mixinOptions = _.extend({}, instance.mixinOptions);
        resolvedMixins = this.composeMixinDependencies(mixins);
        _.each(resolvedMixins, (function(_this) {
          return function(mixinName) {
            return _this.applyMixin(instance, mixinName);
          };
        })(this));
        _.each(resolvedMixins.slice().reverse(), (function(_this) {
          return function(mixinName) {
            return _this.composeMixinOptions(instance, mixinName, args);
          };
        })(this));
        _.each(resolvedMixins, (function(_this) {
          return function(mixinName) {
            return _this.mixinitialize(instance, mixinName);
          };
        })(this));
        instance.__mixin = _.chain(function(obj, mixin, mixinOptions) {
          obj.____mixed = [];
          this.handleMixins(obj, [mixin], mixinOptions);
          return delete obj.____mixed;
        }).bind(this).partial(instance).value();
        return delete instance.____mixed;
      };

      Factory.prototype.handleInjections = function(instance, injections) {
        return _.each(injections, (function(_this) {
          return function(injection) {
            return instance[injection] = _this.get(injection);
          };
        })(this));
      };

      Factory.prototype.handleCreate = function(instance) {
        return _.each(instance.__tags(), (function(_this) {
          return function(tag) {
            var cbs;
            if (_this.tagCbs[tag] == null) {
              _this.tagCbs[tag] = [];
            }
            cbs = _this.tagCbs[tag];
            if (cbs.length === 0) {
              return;
            }
            return _.each(cbs, function(cb) {
              if (_.isFunction(cb)) {
                return cb(instance);
              }
            });
          };
        })(this));
      };

      Factory.prototype.handleTags = function(name, instance, tags) {
        var factoryMap, fullTags;
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
        _.each(fullTags, (function(_this) {
          return function(tag) {
            if (_this.tagMap[tag] == null) {
              _this.tagMap[tag] = [];
            }
            _this.tagMap[tag].push(instance);
            return factoryMap.push(_this.tagMap[tag]);
          };
        })(this));
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
        return _.all(instance.__factoryMap(), function(arr) {
          return __indexOf.call(arr, instance) >= 0;
        });
      };

      Factory.prototype.dispose = function(instance) {
        _.each(instance.__factoryMap(), function(arr) {
          var message;
          message = "Instance Not In Factory :: " + instance + " :: disposal failed!";
          if (__indexOf.call(arr, instance) < 0) {
            throw new Error(message);
          }
          return arr.splice(arr.indexOf(instance), 1);
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
        var message, _base;
        message = "Invalid Argument :: " + (typeof tag) + " provided :: expected String";
        if (!_.isString(tag)) {
          throw new Error(message);
        }
        message = "Invalid Argument :: " + (typeof cb) + " provided :: expected Function";
        if (!_.isFunction(cb)) {
          throw new Error(message);
        }
        _.each(this.tagMap[tag], cb);
        if ((_base = this.tagCbs)[tag] == null) {
          _base[tag] = [];
        }
        return this.tagCbs[tag].push(cb);
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
