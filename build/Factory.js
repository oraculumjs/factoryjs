(function() {
  var __slice = [].slice;

  define(["underscore", "jquery", "backbone"], function(_, $, Backbone) {
    var Factory;
    return Factory = (function() {
      _.extend(Factory.prototype, Backbone.Events);

      function Factory(Base) {
        this.definitions = {};
        this.instances = {};
        this.mixins = {};
        this.tagMap = {};
        this.tagCbs = {};
        this.promises = {};
        this.define("Base", Base);
        this.on("create", this.handleCreate, this);
      }

      Factory.prototype.define = function(name, def, options) {
        var definition, _base;
        if (options == null) {
          options = {};
        }
        if ((this.definitions[name] != null) && !options.override) {
          throw new Error("Definition already exists :: " + name + " :: user overide option to ignore");
        } else {
          if ((_base = this.promises)[name] == null) {
            _base[name] = $.Deferred();
          }
          definition = {};
          if (!_.isFunction(def.extend)) {
            def.extend = Backbone.Model.extend;
          }
          definition.constructor = !_.isFunction(def) ? function() {
            return _.clone(def);
          } : def;
          definition.options = options;
          definition.tags = _.uniq([name].concat(options.tags)).filter(function(i) {
            return !!i;
          });
          this.instances[name] = [];
          _.each(definition.tags, (function(tag) {
            this.tagMap[tag] = this.tagMap[tag] || [];
            return this.tagCbs[tag] = this.tagCbs[tag] || [];
          }), this);
          this.definitions[name] = definition;
          this.trigger("define", definition);
          this.promises[name].resolve(this, name);
        }
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
        var dfd,
          _this = this;
        dfd = this.whenDefined(name);
        require([name], function(def) {
          return _this.define(name, def);
        });
        return dfd;
      };

      Factory.prototype.extend = function(base, name, def, options) {
        var bDef;
        if (options == null) {
          options = {};
        }
        bDef = this.definitions[base];
        if (!bDef) {
          throw new Error("Base Class Not Available :: " + base);
        }
        if (!_.isObject(def)) {
          throw new Error("Invalid Parameter Definition :: expected object :: got " + def.constructor.prototype.toString());
        }
        options.tags = [].concat(bDef.tags, options.tags);
        return this.define(name, bDef.constructor.extend(def), options);
      };

      Factory.prototype.defineMixin = function(name, def, options) {
        if (options == null) {
          options = {};
        }
        if ((this.mixins[name] != null) && !options.override) {
          throw new Error("Mixin already defined :: " + name + " :: use override option to ignore");
        } else {
          this.mixins[name] = def;
        }
        return this;
      };

      Factory.prototype.handleMixins = function(instance, mixins) {
        return _.each(mixins, function(mixin) {
          var mixer;
          mixer = this.mixins[mixin];
          if (!mixer) {
            throw new Error("Mixin Not Defined :: " + mixin);
          }
          instance.mixinOptions = instance.mixinOptions || {};
          _.defaults(instance.mixinOptions, mixer.mixinOptions || {});
          _.extend(instance, _.omit(mixer, 'mixinOptions'));
          if (_.isFunction(instance.mixinitialize)) {
            instance.mixinitialize();
            return instance.mixinitialize = function() {};
          }
        }, this);
      };

      Factory.prototype.handleInjections = function(instance, injections) {
        return _.each(injections, function(injection) {
          return instance[injection] = this.get(injection);
        }, this);
      };

      Factory.prototype.handleCreate = function(instance) {
        return _.each(instance.__tags(), function(tag) {
          var cbs;
          cbs = this.tagCbs[tag];
          if (cbs.length === 0) {
            return;
          }
          return _.each(cbs, function(cb) {
            if (_.isFunction(cb)) {
              return cb(instance);
            }
          }, this);
        }, this);
      };

      Factory.prototype.handleTags = function(name, instance, tags) {
        var factoryMap;
        this.instances[name].push(instance);
        instance.__type = function() {
          return name;
        };
        instance.__tags = function() {
          return [].slice.call(tags);
        };
        factoryMap = [this.instances[name]];
        _.each(tags, function(tag) {
          this.tagMap[tag].push(instance);
          return factoryMap.push(this.tagMap[tag]);
        }, this);
        return instance.__factoryMap = function() {
          return [].slice.call(factoryMap);
        };
      };

      Factory.prototype.get = function() {
        var args, constructor, def, injections, instance, instances, mixins, name, options, singleton, _base;
        name = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        instances = (_base = this.instances)[name] != null ? (_base = this.instances)[name] : _base[name] = [];
        instance = this.instances[name][0];
        def = this.definitions[name];
        if (def == null) {
          throw new Error("Invalid Definition :: " + name + " :: not defined");
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
        this.handleMixins(instance, mixins);
        this.handleInjections(instance, injections);
        this.handleTags(name, instance, def.tags);
        if (_.isFunction(instance.constructed)) {
          instance.constructed();
        }
        instance.__dispose = (function(factory) {
          return function() {
            return factory.dispose(this);
          };
        })(this);
        this.trigger("create", instance);
        return instance;
      };

      Factory.prototype.verifyTags = function(instance) {
        return _.all(instance.__factoryMap(), function(arr) {
          return arr.indexOf(instance) !== -1;
        });
      };

      Factory.prototype.dispose = function(instance) {
        return _.each(instance.__factoryMap(), (function(arr) {
          if (arr.indexOf(instance) === -1) {
            throw new Error("Instance Not In Factory :: " + instance + " :: disposal failed!");
          }
          arr.splice(arr.indexOf(instance), 1);
          return this.trigger("dispose", instance);
        }), this);
      };

      Factory.prototype.getConstructor = function(name, original) {
        if (original == null) {
          original = false;
        }
        if (original) {
          return this.definitions[name].constructor;
        }
        return _.chain(this.get).bind(this).partial(name).value();
      };

      Factory.prototype.onTag = function(tag, cb) {
        var _base;
        if (!_.isString(tag)) {
          throw new Error("Invalid Argument :: " + typeof tag + " provided :: expected String");
        }
        if (!_.isFunction(cb)) {
          throw new Error("Invalid Argument :: " + typeof cb + " provided :: expected Function");
        }
        _.each(this.tagMap[tag], cb);
        if ((_base = this.tagCbs)[tag] == null) {
          _base[tag] = [];
        }
        return this.tagCbs[tag].push(cb);
      };

      Factory.prototype.offTag = function(tag, cb) {
        var cbIdx;
        if (!_.isString(tag)) {
          throw new Error("Invalid Argument :: " + typeof tag + " provided :: expected String");
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
          throw new Error("Callback Not Found :: " + cb + " :: for tag " + tag);
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
