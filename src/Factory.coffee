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

  # Provide a utility for shallow extension of the mixinOptions object.
  # This method only supports certain primitives for extension by design.
  extendMixinOptions = (mixinOptions = {}, mixinDefaults = {}) ->
    for option, defaultValue of mixinDefaults
      value = mixinOptions[option] ?= defaultValue

      # Don't do anything if either value is not an object
      isObject = _.isObject(value) or _.isObject(defaultValue)
      continue unless isObject

      # Don't do anything if either object is a type we don't support
      continue if _.isDate(value) or _.isDate(defaultValue) or
      _.isElement(value) or _.isElement(defaultValue) or
      _.isFunction(value) or _.isFunction(defaultValue) or
      _.isRegExp(value) or _.isRegExp(defaultValue)

      # If it's an array, concat the values
      if _.isArray(value) or _.isArray(defaultValue)
        mixinOptions[option] = value.concat defaultValue
        continue

      # Lastly, if it's a bare object, extend it
      mixinOptions[option] = _.extend {}, defaultValue, value

  # Constructor
  # -----------
  # It only takes one argument, the base class implementation
  # to use as a default. It becomes the 'Base' type, you can extend.

  class Factory
    _.extend @prototype, Backbone.Events

    constructor: (Base, options = {}) ->
      @mixins = {}
      @mixinSettings = {}
      @tagCbs = {}
      @tagMap = {}
      @promises = {}
      @instances = {}
      @definitions = {}
      @define 'Base', Base
      @baseTags = options.baseTags || []
      @on 'create', @handleCreate, this

    # Define
    # ------
    # Use the define method to define a new type (constructor) in the
    # factory.

    define: (name, def, options = {}) ->
      if @definitions[name]? and not options.override
        return this if options.silent
        message = """
          Definition already exists :: #{name} :: user overide option to ignore
        """
        throw new Error message

      # whenDefined support.
      @promises[name] ?= $.Deferred()
      definition = { options }

      # we borrow extend from Backbone unless you brought your own.
      def.extend = Backbone.Model.extend unless _.isFunction(def.extend)

      # we will store an object instead of a function if that is what you need.
      if _.isFunction(def)
        definition.constructor = def
      else
        definition.constructor = -> _.clone(def)
      definition.constructor.prototype.__factory = => this

      # tag support
      tags = [name].concat(options.tags).concat @baseTags
      definition.tags = _.uniq(tags).filter (i) -> !!i
      @instances[name] = []
      _.each definition.tags, (tag) =>
        @tagMap[tag] = @tagMap[tag] or []
        @tagCbs[tag] = @tagCbs[tag] or []

      @definitions[name] = definition
      # if you need to know when a type is defined you can listen to
      # the define event on the factory or ask using whenDefined.
      @trigger 'define', name, definition, options
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

      throw new Error """
        Base Class Not Available :: #{base}
      """ unless bDef

      throw new Error """
        Invalid Parameter Definition ::
        expected object ::
        got #{def.constructor::toString()}
      """ unless _.isObject(def)

      options.tags = _.chain([])
        .union(options.tags)
        .union(bDef.tags)
        .compact().value()

      if options.inheritMixins
        options.mixins = _.chain([])
          .union(bDef.options.mixins)
          .union(options.mixins)
          .compact().value()
        mixinOptions = def.mixinOptions
        mixinDefaults = bDef.constructor::mixinOptions
        extendMixinOptions mixinOptions, mixinDefaults

      if options.singleton?
      then options.singleton = options.singleton
      else options.singleton = bDef.options.singleton

      return @define name, bDef.constructor.extend(def), options

    # Clone
    # -----
    # This can be used to add the definitions from one factory to another.
    # Use it by creating your new clean factory and call clone passing in
    # the factory whose definitions you want to include.

    clone: (factory) ->
      message = "Invalid Argument :: Expected Factory"
      throw new Error message unless factory instanceof Factory
      singletonDefinitions = []
      _.each ["definitions", "mixins", "promises", "mixinSettings"], (key) =>
        _.defaults @[key], factory[key]
        if key is 'definitions'
          _.each @[key], (def, defname) =>
            singletonDefinitions.push defname if def.options.singleton
            @[key][defname].constructor.prototype.__factory = => this
      _.each ["tagCbs","tagMap","promises","instances"], (key) =>
        @[key] ?= {}
        for name, payload of factory[key]
          if key is 'instances' and name in singletonDefinitions
            singleton = true
          if _.isArray(payload)
            @[key][name] ?= []
            if singleton
              @[key][name] = @[key][name]
            else
              @[key][name] = payload.concat(@[key][name])
          if _.isFunction payload?.resolve
            @[key][name] ?= $.Deferred()
            @[key][name].done(payload.resolve)
    # Mirror
    # ------
    # This is a wrapper for clone that keeps this factory synced with the
    # cloned factory. Useful for when you have need to clone a factory that
    # has asynchronous definitions.

    mirror: (factory) ->
      factory.off 'create', factory.handleCreate
      _.chain(this).methods().each (method) =>
        factory[method] = =>
          @[method] arguments...
      @clone factory
      _.chain(factory).keys().each (key) ->
        delete factory[key] unless _.isFunction(factory[key])

    # Define Mixin
    # ------------
    # Use defineMixin to add mixin definitions to the factory. You can
    # use these definitions in the define and extend method by adding
    # a mixins array option with the names of the mixins to include.

    defineMixin: (name, def, options = {}) ->
      if @mixins[name]? and not options.override
        message = """
          Mixin already defined :: #{name} :: use override option to ignore
        """
        throw new Error message
      @mixins[name] = def
      @mixinSettings[name] = options
      @trigger 'defineMixin', name, def, options
      return this

    # Compose Mixin Dependencies
    # --------------------------
    # This allows to get all the mixin dependencies as a consolidated list
    # in the order we are expecting.

    composeMixinDependencies: (mixins = []) ->
      # mixins is the top level mixins
      result = []
      for mixin in mixins
        deps = @mixinSettings[mixin].mixins or []
        result = result.concat @composeMixinDependencies deps
        result.push mixin
      return _.uniq result

    # Apply Mixin
    # -----------
    # Apply a mixin by name to an object. Options that are on the object
    # will be supported by passed in defaults then by mixin defaults. Will
    # invoke mixinitialize and empty mixinitialize method after invocation.

    applyMixin: (instance, mixinName) ->
      mixin = @mixins[mixinName]
      throw new Error("Mixin Not Defined :: #{mixinName}") unless mixin

      unless instance.____mixed
        # we are in a late mix, use transient loop protection
        late_mix = true
        # ignore tags
        ignore_tags = true
        instance.____mixed = []

      return if mixinName in instance.____mixed

      mixinSettings = @mixinSettings[mixinName]
      if mixinSettings.tags and not ignore_tags
        instance.____tags or= []
        instance.____tags = instance.____tags.concat(mixinSettings.tags)

      props = _.omit mixin, 'mixinOptions', 'mixinitialize', 'mixconfig'
      _.extend instance, props

      if late_mix
        @mixinitialize instance, mixinName
        delete instance.____mixed
      else instance.____mixed.push mixinName

      return instance

    # Mixinitialize
    # -------------
    # Invoke the mixin's mixinitialize method on the instance, if it exists.
    # This is done after the mixin's options are composed and its methods
    # applied so that the instance is fully composed.

    mixinitialize: (instance, mixinName) ->
      mixin = @mixins[mixinName]
      mixinitialize = mixin.mixinitialize
      mixinitialize.call instance if _.isFunction mixinitialize

    # Handle Mixins
    # -------------
    # Gets called when an object is created to mixin anything you said
    # to include in the definition. If the mixin defines a mixinitialize
    # method it will get called after initialize and before constructed.

    handleMixins: (instance, mixins, args) ->
      instance.____mixed = []

      # clone the instance's mixinOptions to avoid overwriting the defaults

      instance.mixinOptions = _.extend {}, instance.mixinOptions

      resolvedMixins = @composeMixinDependencies mixins

      instance.__mixins = ->
        resolvedMixins.slice()

      # Iterate over all of our resolved mixins, applying their implementation
      # to the current instance.
      for mixinName in resolvedMixins
        @applyMixin instance, mixinName

      # Because it considers instance.mixinOptions to be canonical
      # this needs to execute in reverse order so higher level mixins
      # take configuration precedence.
      for mixinName in resolvedMixins.slice().reverse()
        mixin = @mixins[mixinName]
        mixinDefaults = mixin.mixinOptions
        mixinOptions = instance.mixinOptions
        extendMixinOptions mixinOptions, mixinDefaults

        # Complete the composition of the mixinOptions object by
        # extending a bare object with mixinDefaults.
        instance.mixinOptions = _.extend {}, mixinDefaults, mixinOptions

      # Invoke the mixin's mixconfig method if available, passing through
      # the mixinOptions object so that it can be modified by reference.
      for mixinName in resolvedMixins
        mixin = @mixins[mixinName]
        mixinOptions = instance.mixinOptions
        mixin.mixconfig? mixinOptions, args...

      #
      for mixinName in resolvedMixins
        @mixinitialize instance, mixinName

      instance.__mixin = _.chain((obj, mixin, mixinOptions) ->
        obj.____mixed = []
        @handleMixins obj, [mixin], mixinOptions
        delete obj.____mixed
      ).bind(this).partial(instance).value()

      delete instance.____mixed

    # Handle Injections
    # -----------------
    # Gets called then an object is created to add anything you said
    # to include in the definition.

    handleInjections: (instance, injections) ->
      instance[name] = @get(type) for name, type of injections

    # Handle Create
    # -------------
    # Gets called when an object is created to handle any events based
    # on tags. This is the engine for doing AOP style Dependency Injection.

    handleCreate: (instance) ->
      for tag in instance.__tags()
        @tagCbs[tag] = [] unless @tagCbs[tag]?
        cbs = @tagCbs[tag]
        continue if cbs.length is 0
        for cb in cbs
          cb instance if _.isFunction(cb)
      true

    # Handle Tags
    # -----------
    # Gets called when an object is created to wire the instance up with
    # all of it's tags. Any type that the object inherits from, any of those
    # types tags and any user defined tags are put into this list for use.

    handleTags: (name, instance, tags) ->
      @instances[name].push instance
      fullTags = _.toArray(tags).concat(instance.____tags or [])
      delete instance.____tags if instance.____tags
      instance.__tags = -> _.toArray fullTags

      factoryMap = [@instances[name]]
      for tag in fullTags
        @tagMap[tag] = [] unless @tagMap[tag]?
        @tagMap[tag].push instance
        factoryMap.push @tagMap[tag]
      factoryMap = _.uniq(factoryMap)
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
      message = "Invalid Definition :: #{name} :: not defined"
      throw new Error message unless def?
      constructor = def.constructor

      options = def.options or {}
      singleton = !!options.singleton
      mixins = options.mixins or []
      injections = options.injections or []

      # singleton support
      return instance if singleton and instance

      # arbitrary arguments length on the constructor
      instance = new constructor args...
      # Set the type immediately
      instance.__type = -> name
      # Set the constructor of the instance to one that's factory wrapped
      instance.constructor = @getConstructor name
      # mixin support
      @handleMixins instance, mixins, args
      # injection support
      @handleInjections instance, injections
      # tag support
      @handleTags name, instance, def.tags
      # late initialization support
      instance.constructed args... if _.isFunction instance.constructed

      # we shortcut the dispose functionality so we can wire it into other
      # frameworks and stuff easily
      instance.__dispose = ((factory) ->
        return -> factory.dispose this
      )(this)

      # we trigger a create event on the factory so we can handle tag listeners
      # but the user can use this for other purposes as well.
      @trigger 'create', instance

      return instance

    # Verify Tags
    # -----------
    # Call this to make sure that the instance hasn't yet been disposed. If it
    # hasn't been disposed this will return true, otherwise return false.

    verifyTags: (instance) ->
      return false unless instance.__factoryMap
      _.all instance.__factoryMap(), (arr) -> instance in arr

    # Dispose
    # -------
    # Call this to remove the instance from the factories memory.
    # Note that this will destroy singletons allowing a singleton
    # object to be constructed again.

    dispose: (instance) ->
      _.each instance.__factoryMap(), (arr) ->
        message = "Instance Not In Factory :: #{instance} :: disposal failed!"
        throw new Error message if instance not in arr
        while arr.indexOf(instance) > -1
          arr.splice arr.indexOf(instance), 1
      @trigger 'dispose', instance

    # Get Constructor
    # ---------------
    # This allows you to use the factory in contexts where a constructor
    # function is expected. The instances returned from this constructor will
    # support all the functionality of the factory including mixins, tags and
    # singleton. Optionally you can pass in the original flag to get the
    # original constructor method. Use this for instance of checks.

    getConstructor: (name, original = false) ->
      return @definitions[name].constructor if original
      result = _.chain(@get).bind(this).partial(name).value()
      result.prototype = @definitions[name].constructor.prototype
      return result

    # On Tag
    # ------
    # Call to run a function on all existing instances that relate to a tag and
    # bind that same function to any future instances created.

    onTag: (tag, cb) ->
      message = "Invalid Argument :: #{typeof tag} provided :: expected String"
      throw new Error message unless _.isString(tag)
      message = "Invalid Argument :: #{typeof cb} provided :: expected Function"
      throw new Error message unless _.isFunction(cb)
      cb instance for instance in @tagMap[tag] or []
      @tagCbs[tag] ?= []
      @tagCbs[tag].push cb
      true

    # Off Tag
    # -------
    # Call to remove a function from calling on all future instances of an
    # instance that relates to a tag.

    offTag: (tag, cb) ->
      message = "Invalid Argument :: #{typeof tag} provided :: expected String"
      throw new Error message unless _.isString(tag)
      return unless @tagCbs[tag]?
      unless _.isFunction(cb)
        @tagCbs[tag] = []
        return
      cbIdx = @tagCbs[tag].indexOf(cb)
      message = "Callback Not Found :: #{cb} :: for tag #{tag}"
      throw new Error message if cbIdx is -1
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
