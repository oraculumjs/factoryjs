(function() {
  var slice = [].slice,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  define(["underscore", "jquery", "backbone"], function(_, $, Backbone) {
    var Factory;
    return Factory = (function() {
      var composeConfig, extendMixinOptions;

      _.extend(Factory.prototype, Backbone.Events);

      extendMixinOptions = function(mixinOptions, mixinDefaults) {
        var defaultValue, isObject, option, results, value;
        if (mixinOptions == null) {
          mixinOptions = {};
        }
        if (mixinDefaults == null) {
          mixinDefaults = {};
        }
        results = [];
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
          results.push(mixinOptions[option] = Factory.composeConfig(defaultValue, value));
        }
        return results;
      };


      /* Compose Config
       * composeConfig allows mixed object/function combinations to be
       * resolvable to configuration objects/arrays, etc.
       * Arrays are concatenated, objects are extended.
       * Constructor configurations are the responsibility of mixins.
       */

      composeConfig = function() {
        var args, defaultConfig, overrideConfig;
        defaultConfig = arguments[0], overrideConfig = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
        if (_.isFunction(defaultConfig)) {
          defaultConfig = defaultConfig.apply(this, args);
        }
        if (_.isFunction(overrideConfig)) {
          overrideConfig = overrideConfig.apply(this, args);
        }
        if (overrideConfig == null) {
          return _.clone(defaultConfig);
        }
        if (_.isArray(defaultConfig) && _.isArray(overrideConfig)) {
          return [].concat(defaultConfig, overrideConfig);
        } else {
          return _.extend({}, defaultConfig, overrideConfig);
        }
      };

      Factory.composeConfig = function() {
        var defaults, overrides;
        defaults = arguments[0], overrides = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        return _.reduce(overrides, (function(defaults, override) {
          if (_.isFunction(defaults) || _.isFunction(override)) {
            return function() {
              return composeConfig.call.apply(composeConfig, [this, defaults, override].concat(slice.call(arguments)));
            };
          } else {
            return composeConfig(defaults, override);
          }
        }), defaults);
      };

      function Factory(Base, options) {
        if (options == null) {
          options = {};
        }
        this.mixins = {};
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
        var base1, definition, tags;
        if (options == null) {
          options = {};
        }
        if ((this.definitions[name] != null) && !options.override) {
          if (options.silent) {
            return this;
          }
          throw new TypeError("Factory#define Definition \"" + name + "\" already exists.\nUse override option to ignore.");
        }
        if ((base1 = this.promises)[name] == null) {
          base1[name] = $.Deferred();
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
        var base1;
        if ((base1 = this.promises)[name] == null) {
          base1[name] = $.Deferred();
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

      Factory.prototype.extend = function(base, name, definition, options) {
        var baseDefinition, extendedDefinition, mixinDefaults, mixinOptions;
        if (options == null) {
          options = {};
        }
        baseDefinition = this.definitions[base];
        if (!baseDefinition) {
          throw new ReferenceError("Factory#extend Base Class \"" + base + "\" Not Available.");
        }
        if (!_.isObject(definition)) {
          throw new TypeError("Factory#extend Invalid Argument.\n`definition` must be an Object.");
        }
        options.tags = _.chain([]).union(options.tags).union(baseDefinition.tags).compact().value();
        if (options.inheritMixins) {
          options.mixins = _.chain([]).union(baseDefinition.options.mixins).union(options.mixins).compact().value();
          mixinOptions = definition.mixinOptions;
          mixinDefaults = baseDefinition.constructor.prototype.mixinOptions;
          extendMixinOptions(mixinOptions, mixinDefaults);
        }
        if (options.singleton != null) {
          options.singleton = options.singleton;
        } else {
          options.singleton = baseDefinition.options.singleton;
        }
        extendedDefinition = baseDefinition.constructor.extend(definition);
        return this.define(name, extendedDefinition, options);
      };

      Factory.prototype.clone = function(factory) {
        var singletonDefinitions;
        if (!(factory instanceof Factory)) {
          throw new TypeError('Factory#clone Invalid Argument.\n`factory` must be an instance of Factory.');
        }
        singletonDefinitions = [];
        _.each(["definitions", "mixins", "promises"], (function(_this) {
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
            var base1, base2, name, payload, ref, results, singleton;
            if (_this[key] == null) {
              _this[key] = {};
            }
            ref = factory[key];
            results = [];
            for (name in ref) {
              payload = ref[name];
              if (key === 'instances' && indexOf.call(singletonDefinitions, name) >= 0) {
                singleton = true;
              }
              if (_.isArray(payload)) {
                if ((base1 = _this[key])[name] == null) {
                  base1[name] = [];
                }
                if (singleton) {
                  _this[key][name] = _this[key][name];
                } else {
                  _this[key][name] = payload.concat(_this[key][name]);
                }
              }
              if (_.isFunction(payload != null ? payload.resolve : void 0)) {
                if ((base2 = _this[key])[name] == null) {
                  base2[name] = $.Deferred();
                }
                results.push(_this[key][name].done(payload.resolve));
              } else {
                results.push(void 0);
              }
            }
            return results;
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

      Factory.prototype.defineMixin = function(mixinName, definition, options) {
        if (options == null) {
          options = {};
        }
        if ((this.mixins[mixinName] != null) && !options.override) {
          throw new TypeError("Factory#defineMixin Mixin " + mixinName + " already defined.\nUse `override` option to ignore.");
        }
        this.mixins[mixinName] = {
          definition: definition,
          options: options
        };
        this.trigger('defineMixin', mixinName, definition, options);
        return this;
      };

      Factory.prototype.composeMixinDependencies = function(mixins) {
        var j, len, mixinName, options, result;
        if (mixins == null) {
          mixins = [];
        }
        result = [];
        for (j = 0, len = mixins.length; j < len; j++) {
          mixinName = mixins[j];
          options = this.mixins[mixinName].options;
          result = result.concat(this.composeMixinDependencies(options.mixins));
          result.push(mixinName);
        }
        return _.uniq(result);
      };

      Factory.prototype.applyMixin = function(instance, mixinName) {
        var definition, ignore_tags, late_mix, options, ref;
        ref = this.mixins[mixinName], definition = ref.definition, options = ref.options;
        if (!definition) {
          throw new TypeError("Factory#applyMixin Mixin " + mixinName + " not defined");
        }
        if (!instance.____mixed) {
          late_mix = true;
          ignore_tags = true;
          instance.____mixed = [];
        }
        if (indexOf.call(instance.____mixed, mixinName) >= 0) {
          return;
        }
        if (options.tags && !ignore_tags) {
          instance.____tags || (instance.____tags = []);
          instance.____tags = instance.____tags.concat(options.tags);
        }
        _.extend(instance, _.omit(definition, ['mixinOptions', 'mixinitialize', 'mixconfig']));
        if (late_mix) {
          this.mixinitialize(instance, mixinName);
          delete instance.____mixed;
        } else {
          instance.____mixed.push(mixinName);
        }
        return instance;
      };

      Factory.prototype.mixinitialize = function(instance, mixinName) {
        var definition, mixinitialize;
        definition = this.mixins[mixinName].definition;
        mixinitialize = definition.mixinitialize;
        if (_.isFunction(mixinitialize)) {
          return mixinitialize.call(instance);
        }
      };

      Factory.prototype.handleMixins = function(instance, mixins, args) {
        var allMixins, definition, j, k, l, len, len1, len2, len3, m, mixinDefaults, mixinName, mixinOptions, ref, resolvedMixins;
        instance.____mixed = [];
        instance.mixinOptions = _.extend({}, instance.mixinOptions);
        allMixins = [].concat(mixins, instance.__mixins());
        resolvedMixins = this.composeMixinDependencies(allMixins);
        instance.__mixins = function() {
          return resolvedMixins;
        };
        for (j = 0, len = resolvedMixins.length; j < len; j++) {
          mixinName = resolvedMixins[j];
          this.applyMixin(instance, mixinName);
        }
        ref = resolvedMixins.slice().reverse();
        for (k = 0, len1 = ref.length; k < len1; k++) {
          mixinName = ref[k];
          definition = this.mixins[mixinName].definition;
          mixinDefaults = definition.mixinOptions;
          mixinOptions = instance.mixinOptions;
          extendMixinOptions(mixinOptions, mixinDefaults);
          instance.mixinOptions = _.extend({}, mixinDefaults, mixinOptions);
        }
        for (l = 0, len2 = resolvedMixins.length; l < len2; l++) {
          mixinName = resolvedMixins[l];
          definition = this.mixins[mixinName].definition;
          mixinOptions = instance.mixinOptions;
          if (typeof definition.mixconfig === "function") {
            definition.mixconfig.apply(definition, [mixinOptions].concat(slice.call(args)));
          }
        }
        for (m = 0, len3 = resolvedMixins.length; m < len3; m++) {
          mixinName = resolvedMixins[m];
          this.mixinitialize(instance, mixinName);
        }
        instance.__mixin = _.chain(function(obj, mixin, mixinOptions) {
          this.handleMixins(obj, [mixin], mixinOptions);
          return delete obj.____mixed;
        }).bind(this).partial(instance).value();
        return delete instance.____mixed;
      };

      Factory.prototype.handleInjections = function(instance, injections) {
        var name, results, type;
        results = [];
        for (name in injections) {
          type = injections[name];
          results.push(instance[name] = this.get(type));
        }
        return results;
      };

      Factory.prototype.handleCreate = function(instance) {
        var cb, cbs, j, k, len, len1, ref, tag;
        ref = instance.__tags();
        for (j = 0, len = ref.length; j < len; j++) {
          tag = ref[j];
          if (this.tagCbs[tag] == null) {
            this.tagCbs[tag] = [];
          }
          cbs = this.tagCbs[tag];
          if (cbs.length === 0) {
            continue;
          }
          for (k = 0, len1 = cbs.length; k < len1; k++) {
            cb = cbs[k];
            if (_.isFunction(cb)) {
              cb(instance);
            }
          }
        }
        return true;
      };

      Factory.prototype.handleTags = function(name, instance, tags) {
        var factoryMap, j, len, ref, tag;
        this.instances[name].push(instance);
        delete instance.____tags;
        factoryMap = [this.instances[name]];
        ref = instance.__tags();
        for (j = 0, len = ref.length; j < len; j++) {
          tag = ref[j];
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
        var args, base1, constructor, def, injections, instance, instances, mixins, name, options, singleton;
        name = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        instances = (base1 = this.instances)[name] != null ? base1[name] : base1[name] = [];
        instance = this.instances[name][0];
        def = this.definitions[name];
        if (def == null) {
          throw new TypeError("Factory#get Definition " + name + " is not defined.");
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
        instance.__mixins = (function(_this) {
          return function() {
            return _this.composeMixinDependencies(mixins);
          };
        })(this);
        instance.__tags = (function(_this) {
          return function() {
            return _this.getTags(instance);
          };
        })(this);
        instance.constructor = this.getConstructor(name);
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


      /* Resolve Instance
       * Provide a method for resolving an instance via a callback or
       * by resolving an instance in the factory.
       */

      Factory.prototype.resolveInstance = function() {
        var args, thing;
        thing = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        if (_.isFunction(thing)) {
          thing = thing.call.apply(thing, [this].concat(slice.call(args)));
        }
        if (_.isString(thing)) {
          return this.get.apply(this, [thing].concat(slice.call(args)));
        }
        return thing;
      };


      /* Get Tags
       * Get all tags for an arbitrary factory instance.
       */

      Factory.prototype.getTags = function(instance) {
        var mixinTags;
        mixinTags = _.chain(instance.__mixins()).map((function(_this) {
          return function(mixinName) {
            var ref, ref1;
            return (ref = _this.mixins[mixinName]) != null ? (ref1 = ref.options) != null ? ref1.tags : void 0 : void 0;
          };
        })(this)).flatten().compact().uniq().value();
        return _.chain([]).union(instance.____tags).union(this.definitions[instance.__type()].tags).union(mixinTags).compact().value();
      };

      Factory.prototype.verifyTags = function(instance) {
        if (!instance.__factoryMap) {
          return false;
        }
        return _.all(instance.__factoryMap(), function(arr) {
          return indexOf.call(arr, instance) >= 0;
        });
      };

      Factory.prototype.dispose = function(instance) {
        _.each(instance.__factoryMap(), function(arr) {
          var results;
          if (indexOf.call(arr, instance) < 0) {
            throw new TypeError("Factory#dispose Instance Not In Factory.\nDisposal failed!");
          }
          results = [];
          while (arr.indexOf(instance) > -1) {
            results.push(arr.splice(arr.indexOf(instance), 1));
          }
          return results;
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
        var base1, instance, j, len, ref;
        if (!_.isString(tag)) {
          throw new TypeError("Factory#onTag Invalid Argument.\n`tag` must be a String.");
        }
        if (!_.isFunction(cb)) {
          throw new TypeError("Factory#onTag Invalid Argument.\n`cb` must be a Function.");
        }
        ref = this.tagMap[tag] || [];
        for (j = 0, len = ref.length; j < len; j++) {
          instance = ref[j];
          cb(instance);
        }
        if ((base1 = this.tagCbs)[tag] == null) {
          base1[tag] = [];
        }
        this.tagCbs[tag].push(cb);
        return true;
      };

      Factory.prototype.offTag = function(tag, cb) {
        var cbIdx;
        if (!_.isString(tag)) {
          throw new TypeError("Factory#offTag Invalid Argument.\n`tag` must be a String.");
        }
        if (this.tagCbs[tag] == null) {
          return;
        }
        if (!_.isFunction(cb)) {
          this.tagCbs[tag] = [];
          return;
        }
        cbIdx = this.tagCbs[tag].indexOf(cb);
        if (cbIdx === -1) {
          throw new ReferenceError("Factory#offTag Callback Not Found for " + tag + ".");
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
