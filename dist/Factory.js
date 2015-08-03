(function() {
  var slice = [].slice,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  define(["underscore", "jquery", "backbone"], function(_, $, Backbone) {
    var Factory, _composeConfig, _enhanceObject, composeConfig, extendMixinOptions;
    _enhanceObject = function(factory, name, definition, object) {
      object.__type = function() {
        return name;
      };
      object.__factory = function() {
        return factory;
      };
      object.__activeMixins = function() {
        return [];
      };
      object.__tags = function() {
        return factory.getTags(object);
      };
      object.__mixins = function() {
        var ref;
        return factory.composeMixinDependencies((ref = definition.options) != null ? ref.mixins : void 0);
      };
      object.__singleton = function() {
        return Boolean(definition.options.singleton);
      };
      object.__mixin = function() {
        return factory.applyMixin.apply(factory, [object].concat(slice.call(arguments)));
      };
      return object.__dispose = function() {
        return factory.disposeInstance.apply(factory, [object].concat(slice.call(arguments)));
      };
    };
    _composeConfig = function() {
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
    composeConfig = function() {
      var defaults, overrides;
      defaults = arguments[0], overrides = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      return _.reduce(overrides, (function(defaults, override) {
        if (_.isFunction(defaults) || _.isFunction(override)) {
          return function() {
            return _composeConfig.call.apply(_composeConfig, [this, defaults, override].concat(slice.call(arguments)));
          };
        } else {
          return _composeConfig(defaults, override);
        }
      }), defaults);
    };
    extendMixinOptions = function(mixinOptions, mixinDefaults) {
      var defaultValue, option, results, value;
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
        if (!(_.isObject(value) && _.isObject(defaultValue))) {
          mixinOptions[option] = value;
          continue;
        }
        if (_.isDate(value) || _.isDate(defaultValue) || _.isElement(value) || _.isElement(defaultValue) || _.isFunction(value) || _.isFunction(defaultValue) || _.isRegExp(value) || _.isRegExp(defaultValue)) {
          continue;
        }
        results.push(mixinOptions[option] = composeConfig(defaultValue, value));
      }
      return results;
    };
    return Factory = (function() {
      _.extend(Factory.prototype, Backbone.Events);

      Factory.composeConfig = composeConfig;

      Factory.extendMixinOptions = extendMixinOptions;

      _.extend(Factory.prototype, {
        composeConfig: composeConfig,
        extendMixinOptions: extendMixinOptions
      });

      function Factory(Base, options) {
        if (options == null) {
          options = {};
        }
        this.mixins = {};
        this.tagMap = {};
        this.promises = {};
        this.instances = {};
        this.mirrors = [];
        this.definitions = {};
        this.tagCallbacks = {};
        this.baseTags = options.baseTags || [];
        this.on('create', (function(_this) {
          return function() {
            return _this.handleCreate.apply(_this, arguments);
          };
        })(this));
        this.on('define', (function(_this) {
          return function() {
            return _this.handleDefine.apply(_this, arguments);
          };
        })(this));
        this.define('Base', Base);
      }

      Factory.prototype.define = function(name, definition, options) {
        var existingDefinition, factory, factoryDefinition;
        if (options == null) {
          options = {};
        }
        if (((existingDefinition = this.getDefinition(name)) != null) && !options.override) {
          if (options.silent) {
            return this;
          }
          factory = existingDefinition.factory;
          throw new Error("Factory#define Definition \"" + name + "\" already exists.\nDefinition exists in factory tagged with " + factory.baseTags + ".\nUse `override` to replace this definition in the current factory.");
        }
        this.whenDefined(name);
        factoryDefinition = {
          options: options
        };
        if (_.isFunction(definition)) {
          factoryDefinition.constructor = definition;
        } else {
          factoryDefinition.constructor = function() {
            return _.clone(definition);
          };
        }
        factoryDefinition.tags = _.chain([name]).union(options.tags).union(this.baseTags).compact().uniq().value();
        this.definitions[name] = factoryDefinition;
        this.trigger('define', name, factoryDefinition, options, this);
        return this;
      };

      Factory.prototype.extend = function(base, name, definition, options) {
        var baseDefinition, baseFactory, extend, extendedDefinition, mixinDefaults, ref;
        if (options == null) {
          options = {};
        }
        ref = this._getDefinitionSpec(base), baseDefinition = ref.definition, baseFactory = ref.factory;
        if (!_.isObject(definition)) {
          throw new TypeError("Factory#extend Invalid Argument.\n`definition` must be an Object.");
        }
        options.tags = _.chain([]).union(options.tags).union(baseDefinition.tags).union(baseFactory.baseTags).compact().uniq().value();
        if (options.inheritMixins) {
          options.mixins = _.chain([]).union(baseDefinition.options.mixins).union(options.mixins).compact().uniq().value();
          mixinDefaults = baseDefinition.constructor.prototype.mixinOptions;
          extendMixinOptions(definition.mixinOptions, mixinDefaults);
        }
        if (Boolean(options.singleton)) {
          options.singleton = Boolean(options.singleton);
        } else {
          options.singleton = Boolean(baseDefinition.options.singleton);
        }
        extend = baseDefinition.constructor.extend || Backbone.Model.extend;
        extendedDefinition = extend.call(baseDefinition.constructor, definition);
        return this.define(name, extendedDefinition, options);
      };

      Factory.prototype.hasDefinition = function(name) {
        return this.getDefinition(name) != null;
      };

      Factory.prototype.getDefinition = function(name) {
        var definition, definitionSpec, factory, i, len, ref;
        if ((definition = this.definitions[name]) != null) {
          return definitionSpec = {
            definition: definition,
            factory: this
          };
        }
        ref = this.mirrors;
        for (i = 0, len = ref.length; i < len; i++) {
          factory = ref[i];
          if ((definitionSpec = factory.getDefinition(name)) != null) {
            return definitionSpec;
          }
        }
      };

      Factory.prototype._getDefinitionSpec = function(name) {
        var definitionSpec;
        if ((definitionSpec = this.getDefinition(name)) == null) {
          throw new ReferenceError("Factory#_getDefinitionSpec Definition " + name + " does not exist.");
        }
        return definitionSpec;
      };

      Factory.prototype.fetchDefinition = function(name) {
        require([name], (function(_this) {
          return function(definition) {
            return _this.define(name, definition);
          };
        })(this));
        return this.whenDefined(name);
      };

      Factory.prototype.whenDefined = function(name) {
        var base1;
        return (base1 = this.promises)[name] != null ? base1[name] : base1[name] = $.Deferred();
      };

      Factory.prototype.getConstructor = function(name, original) {
        var ctor, definition, factory, ref;
        if (original == null) {
          original = false;
        }
        ref = this._getDefinitionSpec(name), definition = ref.definition, factory = ref.factory;
        if (original) {
          return definition.constructor;
        }
        ctor = (function(_this) {
          return function() {
            return _this.getInstance.apply(_this, [name].concat(slice.call(arguments)));
          };
        })(this);
        ctor.prototype = definition.constructor.prototype;
        return ctor;
      };

      Factory.prototype.get = function() {
        return this.getInstance.apply(this, arguments);
      };

      Factory.prototype.getInstance = function() {
        var Constructor, args, base1, definition, factory, injections, instance, mixins, name, ref, ref1, singleton;
        name = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        instance = (ref = this._getFirstInstanceFromMemory(name)) != null ? ref.instance : void 0;
        if (instance && (typeof instance.__singleton === "function" ? instance.__singleton() : void 0)) {
          return instance;
        }
        ref1 = this._getDefinitionSpec(name), definition = ref1.definition, factory = ref1.factory;
        mixins = definition.options.mixins || [];
        singleton = Boolean(definition.options.singleton);
        injections = definition.options.injections || [];
        Constructor = definition.constructor;
        _enhanceObject(this, name, definition, Constructor.prototype);
        instance = (function(func, args, ctor) {
          ctor.prototype = func.prototype;
          var child = new ctor, result = func.apply(child, args);
          return Object(result) === result ? result : child;
        })(Constructor, args, function(){});
        _enhanceObject(this, name, definition, instance);
        instance.constructor = factory.getConstructor(name);
        if ((base1 = this.instances)[name] == null) {
          base1[name] = [];
        }
        this.instances[name].push(instance);
        this.handleDefine(name, definition, {
          ignore_promise: true
        });
        this.handleMixins(instance, mixins, args);
        this.handleInjections(instance, injections);
        this.handleTags(name, instance, definition.tags);
        if (typeof instance.constructed === "function") {
          instance.constructed.apply(instance, args);
        }
        this.trigger.apply(this, ['create', name, instance].concat(slice.call(args)));
        return instance;
      };

      Factory.prototype._getFirstInstanceFromMemory = function(name) {
        var factory, i, instance, instanceSpec, len, ref, ref1;
        if ((instance = (ref = this.instances[name]) != null ? ref[0] : void 0) != null) {
          return instanceSpec = {
            instance: instance,
            factory: this
          };
        }
        ref1 = this.mirrors;
        for (i = 0, len = ref1.length; i < len; i++) {
          factory = ref1[i];
          if ((instanceSpec = factory._getFirstInstanceFromMemory(name)) != null) {
            return instanceSpec;
          }
        }
      };

      Factory.prototype.resolveInstance = function() {
        var args, thing;
        thing = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        if (_.isFunction(thing)) {
          thing = thing.call.apply(thing, [this].concat(slice.call(args)));
        }
        if (_.isString(thing)) {
          thing = this.getInstance.apply(this, [thing].concat(slice.call(args)));
        }
        return thing;
      };


      /* Mixins
      Say something about mixins
       */

      Factory.prototype.defineMixin = function(name, definition, options) {
        var existingMixin, factory;
        if (options == null) {
          options = {};
        }
        if (((existingMixin = this.getMixin(name)) != null) && !options.override) {
          if (options.silent) {
            return this;
          }
          factory = existingMixin.factory;
          throw new Error("Factory#defineMixin Mixin \"" + name + "\" already exists.\nMixin exists in factory tagged with " + factory.baseTags + ".\nUse `override` to replace this mixin in the current factory.");
        }
        this.mixins[name] = {
          definition: definition,
          options: options
        };
        this.trigger('defineMixin', name, definition, options);
        return this;
      };

      Factory.prototype.hasMixin = function(name) {
        return this.getMixin(name) != null;
      };

      Factory.prototype.getMixin = function(name) {
        var factory, i, len, mixin, mixinSpec, ref;
        if ((mixin = this.mixins[name]) != null) {
          return mixinSpec = {
            mixin: mixin,
            factory: this
          };
        }
        ref = this.mirrors;
        for (i = 0, len = ref.length; i < len; i++) {
          factory = ref[i];
          if ((mixinSpec = factory.getMixin(name)) != null) {
            return mixinSpec;
          }
        }
      };

      Factory.prototype._getMixinSpec = function(name) {
        var mixinSpec;
        if ((mixinSpec = this.getMixin(name)) == null) {
          throw new ReferenceError("Factory#_getMixin Mixin " + name + " does not exist.");
        }
        return mixinSpec;
      };

      Factory.prototype.composeMixinDependencies = function(mixins) {
        if (mixins == null) {
          mixins = [];
        }
        return _.chain(mixins).reduce(((function(_this) {
          return function(memo, name) {
            var mixinMixins, mixinSpec, ref;
            mixinSpec = _this._getMixinSpec(name);
            mixinMixins = (ref = mixinSpec.mixin.options) != null ? ref.mixins : void 0;
            if (mixinMixins != null) {
              memo = memo.concat(_this.composeMixinDependencies(mixinMixins));
            }
            memo.push(name);
            return memo;
          };
        })(this)), []).compact().uniq().value();
      };

      Factory.prototype.applyMixin = function(instance, name, args) {
        var activeMixins, dependency, factory, i, ignore_tags, late_mix, len, mixin, mixinDependencies, ref, ref1, ref2, ref3;
        instance.mixinOptions = _.extend({}, instance.mixinOptions);
        ref = this._getMixinSpec(name), mixin = ref.mixin, factory = ref.factory;
        if (indexOf.call(instance.__mixins(), name) < 0) {
          late_mix = true;
          ignore_tags = true;
        }
        if (indexOf.call(instance.__activeMixins(), name) >= 0) {
          return;
        }
        if ((mixinDependencies = (ref1 = mixin.options) != null ? ref1.mixins : void 0) && late_mix) {
          ref2 = this.composeMixinDependencies(mixinDependencies);
          for (i = 0, len = ref2.length; i < len; i++) {
            dependency = ref2[i];
            this.applyMixin(instance, dependency);
          }
        }
        if ((((ref3 = mixin.options) != null ? ref3.tags : void 0) != null) && !ignore_tags) {
          instance.____tags || (instance.____tags = []);
          instance.____tags = instance.____tags.concat(mixin.options.tags);
        }
        _.extend(instance, _.omit(mixin.definition, ['mixinOptions', 'mixinitialize', 'mixconfig']));
        activeMixins = instance.__activeMixins();
        activeMixins.push(name);
        instance.__activeMixins = function() {
          return activeMixins;
        };
        if (late_mix) {
          extendMixinOptions(instance.mixinOptions, mixin.definition.mixinOptions);
          this.mixconfig(instance, name, args);
          this.mixinitialize(instance, name, args);
        }
        return instance;
      };

      Factory.prototype.mixconfig = function(instance, name, args) {
        var base1, base2, factory, mixin, ref;
        ref = this._getMixinSpec(name), mixin = ref.mixin, factory = ref.factory;
        if ((args != null ? args.length : void 0) > 0) {
          return typeof (base1 = mixin.definition).mixconfig === "function" ? base1.mixconfig.apply(base1, [instance.mixinOptions].concat(slice.call(args))) : void 0;
        } else {
          return typeof (base2 = mixin.definition).mixconfig === "function" ? base2.mixconfig(instance.mixinOptions) : void 0;
        }
      };

      Factory.prototype.mixinitialize = function(instance, name, args) {
        var factory, mixin, ref, ref1, ref2;
        ref = this._getMixinSpec(name), mixin = ref.mixin, factory = ref.factory;
        if ((args != null ? args.length : void 0) > 0) {
          return (ref1 = mixin.definition.mixinitialize) != null ? ref1.apply(instance, args) : void 0;
        } else {
          return (ref2 = mixin.definition.mixinitialize) != null ? ref2.apply(instance) : void 0;
        }
      };

      Factory.prototype.handleInjections = function(instance, injections) {
        var definitionName, propertyName, results;
        results = [];
        for (propertyName in injections) {
          definitionName = injections[propertyName];
          results.push(instance[propertyName] = this.getInstance(definitionName));
        }
        return results;
      };

      Factory.prototype.getTags = function(instance) {
        var definitionTags, mixinTags;
        mixinTags = _.chain(instance.__mixins()).map((function(_this) {
          return function(name) {
            var ref;
            return (ref = _this._getMixinSpec(name).mixin.options) != null ? ref.tags : void 0;
          };
        })(this)).flatten().compact().uniq().value();
        definitionTags = this._getDefinitionSpec(instance.__type()).definition.tags;
        return _.chain([]).union(instance.____tags).union(definitionTags).union(mixinTags).compact().uniq().value();
      };

      Factory.prototype.handleDefine = function(name, definition, options) {
        var ref;
        if (!options.ignore_promise) {
          return (ref = this.whenDefined(name)).resolve.apply(ref, arguments);
        }
      };

      Factory.prototype.handleCreate = function() {
        var args, instance, name;
        name = arguments[0], instance = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
        return _.each(instance.__tags(), (function(_this) {
          return function(tag) {
            var callback, callbacks, i, len, results;
            if ((callbacks = _this.tagCallbacks[tag]) == null) {
              return;
            }
            results = [];
            for (i = 0, len = callbacks.length; i < len; i++) {
              callback = callbacks[i];
              results.push(typeof callback === "function" ? callback(instance) : void 0);
            }
            return results;
          };
        })(this));
      };

      Factory.prototype.handleMixins = function(instance, mixins, args) {
        var currentMixins, factory, i, j, k, l, len, len1, len2, len3, mixin, mixinDefaults, mixinOptions, name, ref, ref1, resolvedMixins, results;
        currentMixins = _.chain([]).union(instance.__mixins()).union(mixins).compact().uniq().value();
        resolvedMixins = this.composeMixinDependencies(currentMixins);
        for (i = 0, len = resolvedMixins.length; i < len; i++) {
          name = resolvedMixins[i];
          this.applyMixin(instance, name);
        }
        ref = resolvedMixins.slice().reverse();
        for (j = 0, len1 = ref.length; j < len1; j++) {
          name = ref[j];
          ref1 = this._getMixinSpec(name), mixin = ref1.mixin, factory = ref1.factory;
          mixinOptions = instance.mixinOptions;
          mixinDefaults = mixin.definition.mixinOptions;
          extendMixinOptions(mixinOptions, mixinDefaults);
          instance.mixinOptions = _.extend({}, mixinDefaults, mixinOptions);
        }
        for (k = 0, len2 = resolvedMixins.length; k < len2; k++) {
          name = resolvedMixins[k];
          this.mixconfig(instance, name, args);
        }
        results = [];
        for (l = 0, len3 = resolvedMixins.length; l < len3; l++) {
          name = resolvedMixins[l];
          results.push(this.mixinitialize(instance, name));
        }
        return results;
      };

      Factory.prototype.handleTags = function(name, instance, tags) {
        var factoryMap;
        delete instance.____tags;
        factoryMap = [this.instances[name]];
        tags = instance.__tags();
        _.each(tags, (function(_this) {
          return function(tag) {
            var base1, base2;
            if ((base1 = _this.tagMap)[tag] == null) {
              base1[tag] = [];
            }
            if ((base2 = _this.tagCallbacks)[tag] == null) {
              base2[tag] = [];
            }
            _this.tagMap[tag].push(instance);
            return factoryMap.push(_this.tagMap[tag]);
          };
        })(this));
        return instance.__factoryMap = function() {
          return _.uniq(factoryMap);
        };
      };

      Factory.prototype.mirror = function(factory) {
        if (!(factory instanceof Factory)) {
          throw new TypeError('Factory#mirror Invalid Argument.\n`factory` must be an instance of Factory.');
        }
        this.mirrors.unshift(factory);
        this.baseTags = _.chain(this.baseTags).union(factory.baseTags).compact().uniq().value();
        this.on('create', function() {
          return factory.trigger.apply(factory, ['create'].concat(slice.call(arguments)));
        });
        this.on('dispose', function() {
          return factory.trigger.apply(factory, ['dispose'].concat(slice.call(arguments)));
        });
        this.listenTo(factory, 'define', (function(_this) {
          return function() {
            return _this.trigger.apply(_this, ['define'].concat(slice.call(arguments)));
          };
        })(this));
        return this.listenTo(factory, 'defineMixin', (function(_this) {
          return function() {
            return _this.trigger.apply(_this, ['defineMixin'].concat(slice.call(arguments)));
          };
        })(this));
      };

      Factory.prototype.dispose = function(thing) {
        if (thing == null) {
          return this.disposeFactory;
        }
        if (thing instanceof Factory) {
          return this.disposeFactory(thing);
        }
        return this.disposeInstance(thing);
      };

      Factory.prototype.disposeInstance = function(instance, options) {
        var array, i, index, len, ref;
        if (options == null) {
          options = {};
        }
        ref = instance.__factoryMap();
        for (i = 0, len = ref.length; i < len; i++) {
          array = ref[i];
          if (indexOf.call(array, instance) < 0) {
            if (options.silent) {
              return this;
            }
            throw new ReferenceError(("Factory#dispose Instance not in Factory.\nInstance does not exist in factory tagged with " + this.baseTags + ".\nUse `silent` option to ignore.") && !options.silent);
          }
          while ((index = array.indexOf(instance)) > -1) {
            array.splice(index, 1);
          }
        }
        return this.trigger('dispose', instance);
      };

      Factory.prototype.disposeFactory = function(factory) {
        if (factory == null) {
          factory = this;
        }
      };

      Factory.prototype.verifyTags = function() {
        return this.verifyInstance.apply(this, arguments);
      };

      Factory.prototype.verifyInstance = function(instance) {
        var factoryMap;
        if (!(factoryMap = typeof instance.__factoryMap === "function" ? instance.__factoryMap() : void 0)) {
          return false;
        }
        return _.all(factoryMap, function(arr) {
          return indexOf.call(arr, instance) >= 0;
        });
      };

      Factory.prototype.onTag = function(tag, cb) {
        var base1, i, instance, len, ref;
        if (!_.isString(tag)) {
          throw new TypeError("Factory#onTag Invalid Argument.\n`tag` must be a String.");
        }
        if (!_.isFunction(cb)) {
          throw new TypeError("Factory#onTag Invalid Argument.\n`cb` must be a Function.");
        }
        ref = this.tagMap[tag] || [];
        for (i = 0, len = ref.length; i < len; i++) {
          instance = ref[i];
          cb(instance);
        }
        if ((base1 = this.tagCallbacks)[tag] == null) {
          base1[tag] = [];
        }
        this.tagCallbacks[tag].push(cb);
        return true;
      };

      Factory.prototype.offTag = function(tag, cb) {
        var cbIdx;
        if (!_.isString(tag)) {
          throw new TypeError("Factory#offTag Invalid Argument.\n`tag` must be a String.");
        }
        if (this.tagCallbacks[tag] == null) {
          return;
        }
        if (!_.isFunction(cb)) {
          this.tagCallbacks[tag] = [];
          return;
        }
        cbIdx = this.tagCallbacks[tag].indexOf(cb);
        if (cbIdx === -1) {
          throw new ReferenceError("Factory#offTag Callback Not Found for " + tag + ".");
        }
        return this.tagCallbacks[tag].splice(cbIdx, 1);
      };

      return Factory;

    })();
  });

}).call(this);
