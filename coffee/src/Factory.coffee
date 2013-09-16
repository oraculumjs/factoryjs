# Factory for object management
# ------------
# Use require, this depends on underscore, jquery and backbone.

define [
  "underscore",
  "jquery",
  "backbone"
], (_, $, Backbone) ->

  # Factory objects can
  #
  #  * hold type definitions
  #  * return objects of those types
  #  * hold mixin definitions
  #  * mixin those mixins to defined objects of types
  #  * return singleton type definitions
  #  * extend existing definitions
  #  * tag objects with types and other metadata
  #  * retrieve and manipulate objects by tag
  #  * dispose of objects
  #  * inject objects onto keys of other objects by name

  # Constructor
  # -----------
  # It only takes one argument, the base class implementation
  # to use as a default. It becomes the 'Base' type, you can extend.

  class Factory
    _.extend @prototype, Backbone.Events

    constructor: (Base) ->
      @mixins = {}
      @tagCbs = {}
      @tagMap = {}
      @promises = {}
      @instances = {}
      @definitions = {}
      @define 'Base', Base
      @on 'create', @handleCreate, this

    # Define
    # ------
    # Use the define method to define a new type (constructor) in the
    # factory.

    define: (name, def, options = {}) ->
      if @definitions[name]? and not options.override
        throw new Error "Definition already exists :: #{name} :: user overide option to ignore"

      # whenDefined support.
      @promises[name] ?= $.Deferred()
      definition = { options }

      # we borrow extend from Backbone unless you brought your own.
      def.extend = Backbone.Model.extend unless _.isFunction(def.extend)

      # we will store an object instead of a function if that is what you need.
      definition.constructor = if _.isFunction(def) then def else -> _.clone(def)
      definition.constructor.prototype.__factory = => this

      # tag support
      definition.tags = _.uniq([name].concat(options.tags)).filter (i) -> !!i
      @instances[name] = []
      _.each definition.tags, (tag) =>
        @tagMap[tag] = @tagMap[tag] or []
        @tagCbs[tag] = @tagCbs[tag] or []

      @definitions[name] = definition
      # if you need to know when a type is defined you can listen to
      # the define event on the factory or ask using whenDefined.
      @trigger "define", definition
      @promises[name].resolve(this, name)
      return this

    # Has Definition
    # --------------
    # Find out if the factory already has a definition by name.

    hasDefinition: (name) ->
      !!@definitions[name]

    # When Defined
    # ------------
    # Find out when a definition has been loaded into the factory
    # by name. This returns a jQuery promise object.

    whenDefined: (name) ->
      @promises[name] ?= $.Deferred()
      @promises[name].promise()

    # Fetch Definition
    # ----------------
    # Fetch a definition from the server and callback when done
    #
    #     WARNING! this will not work with jquery or other polymorphic
    #     function API's. It does expect functions to be constructors!

    fetchDefinition: (name) ->
      dfd = @whenDefined(name)
      require [name], (def) =>
        # Just in case the module is not setup to use the factory
        # this will get ignored if the module defines itself in the
        # factory.
        @define name, def
      return dfd

    # Extend
    # ------
    # Use extend to define a new type that extends another type in the
    # factory. It basically uses Backbone.Model extend unless you provide
    # your own.

    extend: (base, name, def, options = {}) ->
      bDef = @definitions[base]
      throw new Error("Base Class Not Available :: #{base}") unless bDef
      throw new Error("Invalid Parameter Definition :: expected object :: got " + def.constructor::toString()) unless _.isObject(def)
      options.tags = [].concat(bDef.tags, options.tags)
      return @define name, bDef.constructor.extend(def), options

    # Clone
    # -----
    # This can be used to add the definitions from one factory to another.
    # Use it by creating your new clean factory and call clone passing in
    # the factory whose definitions you want to include.

    clone: (factory) ->
      throw new Error "Invalid Argument :: Expected Factory" unless factory instanceof Factory
      _.each ["definitions", "mixins", "promises"], (key) =>
        _.defaults @[key], factory[key]
        if key is 'definitions'
          _.each @[key], (def, defname) =>
            @[key][defname].constructor.prototype.__factory = => this
    # Define Mixin
    # -----------
    # Use defineMixin to add mixin definitions to the factory. You can
    # use these definitions in the define and extend method by adding
    # a mixins array option with the names of the mixins to include.

    defineMixin: (name, def, options = {}) ->
      if @mixins[name]? and not options.override
        throw new Error "Mixin already defined :: #{name} :: use override option to ignore"
      else
        @mixins[name] = def
      return this

    # Handle Mixins
    # -------------
    # Gets called when an object is created to mixin anything you said
    # to include in the definition. If the mixin defines a mixinitialize
    # method it will get called after initialize and before constructed.

    handleMixins: (instance, mixins) ->
      _.each mixins, (mixin) =>
        mixer = @mixins[mixin]
        throw new Error("Mixin Not Defined :: #{mixin}") unless mixer
        instance.mixinOptions = instance.mixinOptions or {}
        _.defaults instance.mixinOptions, mixer.mixinOptions or {}
        _.extend instance, _.omit mixer, 'mixinOptions'
        if _.isFunction instance.mixinitialize
          instance.mixinitialize()
          instance.mixinitialize = ->

    # Handle Injections
    # -----------------
    # Gets called then an object is created to add anything you said
    # to include in the definition.

    handleInjections: (instance, injections) ->
      _.each injections, (injection) =>
        instance[injection] = @get(injection)

    # Handle Create
    # -------------
    # Gets called when an object is created to handle any events based
    # on tags. This is the engine for doing AOP style Dependency Injection.

    handleCreate: (instance) ->
      _.each instance.__tags(), (tag) =>
        @tagCbs[tag] = [] unless @tagCbs[tag]?
        cbs = @tagCbs[tag]
        return if cbs.length is 0
        _.each cbs, (cb) =>
          cb instance if _.isFunction(cb)

    # Handle Tags
    # -----------
    # Gets called when an object is created to wire the instance up with
    # all of it's tags. Any type that the object inherits from, any of those
    # types tags and any user defined tags are put into this list for use.

    handleTags: (name, instance, tags) ->
      @instances[name].push instance
      instance.__type = -> name
      instance.__tags = -> [].slice.call tags

      factoryMap = [@instances[name]]
      _.each tags, (tag) =>
        @tagMap[tag] = [] unless @tagMap[tag]?
        @tagMap[tag].push instance
        factoryMap.push @tagMap[tag]
      instance.__factoryMap = -> [].slice.call factoryMap

    # Get
    # ---
    # Call this with the name of the object type you want to get. You will
    # definitely get that kind of object back. This is a pretty big function
    # but it's just generally making decisions about the options you defined
    # earlier.

    get: (name, args...) ->
      instances = @instances[name] ?= []
      instance = @instances[name][0]
      def = @definitions[name]
      throw new Error("Invalid Definition :: #{name} :: not defined") unless def?
      constructor = def.constructor

      options = def.options or {}
      singleton = !!options.singleton
      mixins = options.mixins or []
      injections = options.injections or []

      # singleton support
      return instance if singleton and instance

      # arbitrary arguments length on the constructor
      instance = new constructor(args...)
      # mixin support
      @handleMixins instance, mixins
      # injection support
      @handleInjections instance, injections
      # tag support
      @handleTags name, instance, def.tags
      # late initialization support
      instance.constructed() if _.isFunction instance.constructed

      # we shortcut the dispose functionality so we can wire it into other
      # frameworks and stuff easily
      instance.__dispose = ((factory) ->
        return -> factory.dispose this
      )(this)

      # we trigger a create event on the factory so we can handle tag listeners
      # but the user can use this for other purposes as well.
      @trigger 'create', instance

      instance

    # Verify Tags
    # -----------
    # Call this to make sure that the instance hasn't yet been disposed. If it
    # hasn't been disposed this will return true, otherwise it will return false.

    verifyTags: (instance) ->
      _.all instance.__factoryMap(), (arr) -> instance in arr

    # Dispose
    # -------
    # Call this to remove the instance from the factories memory.
    # Note that this will destroy singletons allowing a singleton
    # object to be constructed again.

    dispose: (instance) ->
      _.each instance.__factoryMap(), (arr) =>
        throw new Error("Instance Not In Factory :: #{instance} :: disposal failed!") if instance not in arr
        arr.splice arr.indexOf(instance), 1
      @trigger 'dispose', instance

    # Get Constructor
    # ---------------
    # This allows you to use the factory in contexts where a constructor function
    # is expected. The instances returned from this constructor will support all
    # the functionality of the factory including mixins, tags and singleton. Optionally
    # you can pass in the original flag to get the original constructor method. Use
    # this for instance of checks.

    getConstructor: (name, original = false) ->
      return @definitions[name].constructor if original
      _.chain(@get).bind(this).partial(name).value()

    # On Tag
    # ------
    # Call to run a function on all existing instances that relate to a tag and
    # bind that same function to any future instances created.

    onTag: (tag, cb) ->
      throw new Error("Invalid Argument :: " + typeof tag + " provided :: expected String") unless _.isString(tag)
      throw new Error("Invalid Argument :: " + typeof cb + " provided :: expected Function") unless _.isFunction(cb)
      _.each @tagMap[tag], cb
      @tagCbs[tag] ?= []
      @tagCbs[tag].push cb

    # Off Tag
    # -------
    # Call to remove a function from calling on all future instances of an instance
    # that relates to a tag.

    offTag: (tag, cb) ->
      throw new Error("Invalid Argument :: #{typeof tag} provided :: expected String") unless _.isString(tag)
      return unless @tagCbs[tag]?
      unless _.isFunction(cb)
        @tagCbs[tag] = []
        return
      cbIdx = @tagCbs[tag].indexOf(cb)
      throw new Error "Callback Not Found :: #{cb} :: for tag #{tag}" if cbIdx is -1
      @tagCbs[tag].splice cbIdx, 1

    # Is Type
    # -------
    # Call this to check if the instance passed in if of the passed in type.

    isType: (instance, type) ->
      return instance.__type() is type

    # Get Type
    # --------
    # Call this to get the type of the instance as a string.

    getType: (instance) ->
      return instance.__type()

  # And there you go, have fun with it.
