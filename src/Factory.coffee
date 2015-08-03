# Factory for object management
# ------------
# Use require, this depends on underscore, jquery and backbone.

define [
  "underscore",
  "jquery",
  "backbone"
], (_, $, Backbone) ->

  # Factory objects can
  #  * Define constructors.
  #  * Extend existing constructors.
  #  * Create instances of a constructor.
  #  * Dispose instance references.
  #  * Resolve singletons instances.
  #  * Define mixins.
  #  * Compose mixins onto an instance.
  #  * Tag instances with types and other metadata.
  #  * Retrieve and manipulate instances by tag.
  #  * Inject instances into other instances.

  # Enhance Object
  # --------------
  # Ensures that an object has the correct factory interface
  enhanceObject = (factory, name, options, object) ->
    # Object environment interfaces
    object.__type = -> name
    object.__factory = -> factory
    object.__activeMixins = -> []

    object.__tags = ->
      return factory.getTags object

    object.__mixins = ->
      return factory.composeMixinDependencies options?.mixins

    object.__singleton = ->
      return Boolean options.singleton

    # Factory method interfaces
    object.__mixin = -> factory.applyMixin object, arguments...
    object.__dispose = -> factory.disposeInstance object, arguments...

  # Compose Config
  # --------------
  # composeConfig allows mixed object/function combinations to be
  # resolvable to configuration objects/arrays, etc.
  # Arrays are concatenated, objects are extended.
  # Constructor configurations are the responsibility of mixins.

  _composeConfig = (defaultConfig, overrideConfig, args...) ->
    if _.isFunction defaultConfig
      defaultConfig = defaultConfig.apply this, args
    if _.isFunction overrideConfig
      overrideConfig = overrideConfig.apply this, args
    return _.clone(defaultConfig) unless overrideConfig?
    return if _.isArray(defaultConfig) and _.isArray(overrideConfig)
    then [].concat defaultConfig, overrideConfig
    else _.extend {}, defaultConfig, overrideConfig

  composeConfig = (defaults, overrides...) ->
    return _.reduce overrides, ((defaults, override) ->
      return if _.isFunction(defaults) or _.isFunction(override)
      then -> _composeConfig.call this, defaults, override, arguments...
      else _composeConfig defaults, override
    ), defaults

  extendMixinOptions = (mixinOptions = {}, mixinDefaults = {}) ->
    for option, defaultValue of mixinDefaults
      value = mixinOptions[option] ?= defaultValue

      # Override the default value if one of the values is not extendable.
      unless _.isObject(value) and _.isObject(defaultValue)
        mixinOptions[option] = value
        continue

      # Don't do anything if either object is a type we don't support.
      continue if _.isDate(value) or _.isDate(defaultValue) or
      _.isElement(value) or _.isElement(defaultValue) or
      _.isFunction(value) or _.isFunction(defaultValue) or
      _.isRegExp(value) or _.isRegExp(defaultValue)

      mixinOptions[option] = composeConfig defaultValue, value

  class Factory
    _.extend @prototype, Backbone.Events

    # Expose enhanceObject, extendMixinOptions and composeConfig as
    # class and instance methods
    @enhanceObject: enhanceObject
    @composeConfig: composeConfig
    @extendMixinOptions: extendMixinOptions
    _.extend @prototype, {enhanceObject, composeConfig, extendMixinOptions}

    # Constructor
    # -----------
    # It only takes one argument, the base class implementation
    # to use as a default. It becomes the 'Base' type, you can extend.

    constructor: (Base, options = {}) ->
      @mixins = {}
      @tagMap = {}
      @promises = {}
      @instances = {}
      @mirrors = []
      @definitions = {}
      @tagCallbacks = {}
      @baseTags = options.baseTags or []
      @on 'create', => @handleCreate arguments...
      @on 'define', => @handleDefine arguments...
      # @on 'dispose', => @handleDispose arguments...
      @define 'Base', Base

    # Define
    # ------
    # Use the define method to define a new type (constructor)
    # in the factory.

    define: (name, definition, options = {}) ->
      if (existingDefinition = @getDefinition(name))? and not options.override
        return this if options.silent
        {factory} = existingDefinition
        throw new Error """
          Factory#define Definition "#{name}" already exists.
          Definition exists in factory tagged with #{factory.baseTags}.
          Use `override` to replace this definition in the current factory.
        """

      # Have whenDefined create a new promise for this definition
      @whenDefined name

      # Create the new definition.
      factoryDefinition = { options }

      # Store an object instead of a function if necessary.
      if _.isFunction(definition)
      then factoryDefinition.constructor = definition
      else factoryDefinition.constructor = -> _.clone definition

      # Compose all the tags for this definition.
      factoryDefinition.tags = _.chain([name])
        .union(options.tags).union(@baseTags)
        .compact().uniq().value()

      # Push this definition into our definitions array.
      @definitions[name] = factoryDefinition

      # If you need to know when a type is defined you can listen to
      # the define event on the factory or ask using whenDefined.
      @trigger 'define', name, factoryDefinition, options, this

      # Return the factory for chaining.
      return this

    # Extend
    # ------
    # Use extend to create a new definition that extends another in the factory.
    # It uses the default extend method (Backbone.Model.extend) on the
    # constructor unless a custom implementation was provided.

    extend: (base, name, definition, options = {}) ->
      # Attempt to resolve the base defintion from this, or upstream mirrors.
      {definition:baseDefinition,factory:baseFactory} = @_getDefinitionSpec base

      throw new TypeError """
        Factory#extend Invalid Argument.
        `definition` must be an Object.
      """ unless _.isObject definition

      options.tags = _.chain([])
        .union(options.tags)
        .union(baseDefinition.tags)
        .union(baseFactory.baseTags)
        .compact().uniq().value()

      if options.inheritMixins
        options.mixins = _.chain([])
          .union(baseDefinition.options.mixins)
          .union(options.mixins)
          .compact().uniq().value()
        mixinDefaults = baseDefinition.constructor::mixinOptions
        extendMixinOptions definition.mixinOptions, mixinDefaults

      if Boolean options.singleton
      then options.singleton = Boolean options.singleton
      else options.singleton = Boolean baseDefinition.options.singleton

      # No class-level extend method? No problem. We'll borrow Backbone's
      extend = baseDefinition.constructor.extend or Backbone.Model.extend
      extendedDefinition = extend.call baseDefinition.constructor, definition

      return @define name, extendedDefinition, options

    # Has Definition
    # --------------
    # Find out if the factory has a definition by name.

    hasDefinition: (name) ->
      return @getDefinition(name)?

    # Get Definition
    # --------------
    # Finds a requested definition in the current or mirrored mirrors

    getDefinition: (name) ->
      if (definition = @definitions[name])?
        return definitionSpec = {definition, factory: this}
      for factory in @mirrors
        if (definitionSpec = factory.getDefinition name)?
          return definitionSpec

    _getDefinitionSpec: (name) ->
      throw new ReferenceError """
        Factory#_getDefinitionSpec Definition #{name} does not exist.
      """ unless (definitionSpec = @getDefinition name)?
      return definitionSpec

    # Fetch Definition
    # ----------------
    # Fetch a definition from the server and callback when done
    #
    # WARNING! this will not work with jquery or other polymorphic
    # function API's. It expects functions to be constructors!
    # TODO: This should support CJS/Node

    fetchDefinition: (name) ->
      require [name], (definition) =>
        # Just in case the module is not setup to use the factory
        # this will get ignored if the module defines itself in the
        # factory.
        @define name, definition
      return @whenDefined(name)

    # When Defined
    # ------------
    # Find out when a definition has been loaded into the factory
    # by name. This returns a jQuery promise object.

    whenDefined: (name) ->
      return @promises[name] ?= $.Deferred()

    # Get Constructor
    # ---------------
    # This allows you to use the factory in contexts where a constructor
    # function is expected. The instances returned from this constructor will
    # support all the functionality of the factory including mixins, tags and
    # singleton. Optionally you can pass in the original flag to get the
    # original constructor method. Use this for instance of checks.

    getConstructor: (name, original = false) ->
      # Attempt to resolve the defintion from this, or upstream mirrors.
      {definition, factory} = @_getDefinitionSpec name

      # If the original ctor was requested, return it immediately.
      return definition.constructor if original

      # Else, create a ctor partial bount to the factory get method.
      ctor = => @getInstance name, arguments...
      ctor.prototype = definition.constructor.prototype

      return ctor

    # Get
    # ---
    # An alias for getInstance

    get: -> @getInstance arguments...

    # Get Instance
    # ------------
    # Call this with the name of the object type you want to get. You will
    # definitely get that kind of object back. This is a pretty big function
    # but it's just generally making decisions about the options you defined
    # earlier.

    getInstance: (name, args...) ->
      # Check to see if an instance of this definition already exists in this
      # or any mirrored factories
      instance = @_getFirstInstanceFromMemory(name)?.instance
      return instance if instance and instance.__singleton?()

      # Attempt to resolve the defintion from this, or upstream mirrors.
      {definition, factory} = @_getDefinitionSpec name

      # Resolve all the options for this definition
      options = definition.options
      mixins = options.mixins or []
      singleton = Boolean options.singleton
      injections = options.injections or []

      # Get a reference to the constructor
      Constructor = definition.constructor

      # Enhance the constructor's prototype so that the factory interfaces
      # are available immediately upon construction.
      @enhanceObject this, name, options, Constructor.prototype

      # Create the instance
      instance = new Constructor args...

      # Enhance the instance, in case it's a bare object instead of a proper
      # Constructor.
      @enhanceObject this, name, options, instance

      # Set the constructor of the instance to one that's factory wrapped
      instance.constructor = factory.getConstructor name

      # Then push the instance into the right cache.
      @instances[name] ?= []
      @instances[name].push instance

      # Ensure this definition has the appropriate caches on the factory.
      @handleDefine name, definition, ignore_promise: true

      # Compose mixins on the instance.
      @handleMixins instance, mixins, args

      # Compose injections on the instance.
      @handleInjections instance, injections

      # Trigger evets for tags on the instance.
      @handleTags name, instance, definition.tags

      # If there's a constructed method, execute it with our ctor args.
      instance.constructed? args...

      # Notify any listeners that a new instance was created.
      @trigger 'create', name, instance, args...

      return instance

    _getFirstInstanceFromMemory: (name) ->
      if (instance = @instances[name]?[0])?
        return instanceSpec = {instance, factory: this}
      for factory in @mirrors
        if (instanceSpec = factory._getFirstInstanceFromMemory name)?
          return instanceSpec

    # Resolve Instance
    # ----------------
    # Provide a method for resolving an instance via a callback or
    # by resolving an instance in the factory.

    resolveInstance: (thing, args...) ->
      thing = thing.call this, args... if _.isFunction thing
      thing = @getInstance thing, args... if _.isString thing
      return thing

    ### Mixins
    Say something about mixins
    ###

    # Define Mixin
    # ------------
    # Use defineMixin to add mixin definitions to the factory. You can
    # use these definitions in the define and extend method by adding
    # a mixins array option with the names of the mixins to include.

    defineMixin: (name, definition, options = {}) ->
      if (existingMixin = @getMixin(name))? and not options.override
        return this if options.silent
        {factory} = existingMixin
        throw new Error """
          Factory#defineMixin Mixin "#{name}" already exists.
          Mixin exists in factory tagged with #{factory.baseTags}.
          Use `override` to replace this mixin in the current factory.
        """
      @mixins[name] = {definition, options}
      @trigger 'defineMixin', name, definition, options
      return this

    # Has Mixin
    # ---------
    # Find out if the factory has a mixin by name.

    hasMixin: (name) ->
      return @getMixin(name)?

    # Get Mixin
    # ---------
    # Finds a requested mixin in the current or mirrored mirrors

    getMixin: (name) ->
      if (mixin = @mixins[name])?
        return mixinSpec = {mixin, factory: this}
      for factory in @mirrors
        if (mixinSpec = factory.getMixin name)?
          return mixinSpec

    # _getMixin
    # ---------
    # A wrapper around getMixin that throws if the requested mixin isn't defined

    _getMixinSpec: (name) ->
      throw new ReferenceError """
        Factory#_getMixin Mixin #{name} does not exist.
      """ unless (mixinSpec = @getMixin name)?
      return mixinSpec

    # Compose Mixin Dependencies
    # --------------------------
    # This allows to get all the mixin dependencies as a consolidated list
    # in the order we are expecting.

    composeMixinDependencies: (mixins = []) ->
      # mixins is the top level mixins
      return _.chain(mixins).reduce(((memo, name) =>
        mixinSpec = @_getMixinSpec name
        mixinMixins = mixinSpec.mixin.options?.mixins
        memo = memo.concat @composeMixinDependencies mixinMixins if mixinMixins?
        memo.push name
        return memo
      ), []).compact().uniq().value()

    # Apply Mixin
    # -----------
    # Apply a mixin by name to an object. Options that are on the object
    # will be supported by passed in defaults then by mixin defaults. Will
    # invoke mixinitialize and empty mixinitialize method after invocation.

    applyMixin: (instance, name, args) ->
      # clone the instance's mixinOptions to avoid overwriting the defaults.
      instance.mixinOptions = _.extend {}, instance.mixinOptions

      # Attempt to resolve the defintion from this, or upstream mirrors.
      # This will throw if @getMixin cannot resolve the target.
      {mixin, factory} = @_getMixinSpec name

      unless name in instance.__mixins()
        late_mix = true # we are in a late mix, use transient loop protection.
        ignore_tags = true # ignore tags.

      # Do no further processing if the instance already has this mixin.
      return if name in instance.__activeMixins()

      # Ensure we apply ally mixin dependencies if we're in a late mix.
      if (mixinDependencies = mixin.options?.mixins) and late_mix
        for dependency in @composeMixinDependencies mixinDependencies
          @applyMixin instance, dependency

      # If we have tags and we're not in a late mix, add the tags.
      if mixin.options?.tags? and not ignore_tags
        instance.____tags or= []
        instance.____tags = instance.____tags.concat mixin.options.tags

      # Extend the instance with the mixin's implementation, omitting
      # factoryjs-specific mixin properties.
      _.extend instance, _.omit mixin.definition, [
        'mixinOptions', 'mixinitialize', 'mixconfig'
      ]

      # Push this mixin name into the growing list of active mixins
      activeMixins = instance.__activeMixins()
      activeMixins.push name

      # And reassign the function with our new list.
      instance.__activeMixins = -> activeMixins

      # If we're in a late mix, initialize the mixin.
      if late_mix
        extendMixinOptions instance.mixinOptions, mixin.definition.mixinOptions
        @mixconfig instance, name, args
        @mixinitialize instance, name, args

      # Return the instance for consumption
      return instance

    # Mixconfig
    # ---------
    # Allow mixin-specified constructor arguments to modify configuration.
    # This method intentionally omits the instance scope to discourage
    # instance manipulation in mixconfig (no-no).

    mixconfig: (instance, name, args) ->
      {mixin, factory} = @_getMixinSpec name
      if args?.length > 0
      then mixin.definition.mixconfig? instance.mixinOptions, args...
      else mixin.definition.mixconfig? instance.mixinOptions

    # Mixinitialize
    # -------------
    # Invoke the mixin's mixinitialize method on the instance, if it exists.
    # This is done after the mixin's options are composed and its methods
    # applied so that the instance is fully composed.

    mixinitialize: (instance, name, args) ->
      {mixin, factory} = @_getMixinSpec name
      if args?.length > 0
      then mixin.definition.mixinitialize?.apply instance, args
      else mixin.definition.mixinitialize?.apply instance

    # Handle Injections
    # -----------------
    # Gets called then an object is created to add anything you said
    # to include in the definition.

    handleInjections: (instance, injections) ->
      for propertyName, definitionName of injections
        instance[propertyName] = @getInstance definitionName

    # Get Tags
    # ----------
    # Get a list of tags from inherited definitions, mixins, etc.

    getTags: (instance) ->
      mixinTags = _.chain(instance.__mixins()).map((name) =>
        return @_getMixinSpec(name).mixin.options?.tags
      ).flatten().compact().uniq().value()
      definitionTags = @_getDefinitionSpec(instance.__type()).definition.tags
      return _.chain([]).union(instance.____tags)
        .union(definitionTags)
        .union(mixinTags)
        .compact()
        .uniq()
        .value()

    # Handle Define
    # -------------
    # Gets called when a definition is defined in this, or any mirrored
    # mirrors.

    handleDefine: (name, definition, options) ->
      # Resolved any whenDefined callbacks for this instance type
      @whenDefined(name).resolve arguments... unless options.ignore_promise

    # Handle Create
    # -------------
    # Gets called when an object is created to handle any events based
    # on tags. This is the engine for doing AOP style Dependency Injection.

    handleCreate: (name, instance, args...) ->
      _.each instance.__tags(), (tag) =>
        return unless (callbacks = @tagCallbacks[tag])?
        callback? instance for callback in callbacks

    # Handle Mixins
    # -------------
    # Gets called when an object is created to mixin anything you said
    # to include in the definition. If the mixin defines a mixinitialize
    # method it will get called after initialize and before constructed.

    handleMixins: (instance, mixins, args) ->
      # Resolve the mixin's dependencies
      currentMixins = _.chain([]).union(instance.__mixins())
        .union(mixins).compact().uniq().value()
      resolvedMixins = @composeMixinDependencies currentMixins

      # Iterate over all of our resolved mixins, applying their implementation
      # to the current instance.
      @applyMixin instance, name for name in resolvedMixins

      # Because it considers instance.mixinOptions to be canonical
      # this needs to execute in reverse order so higher level mixins
      # take configuration precedence.
      for name in resolvedMixins.slice().reverse()
        # Attempt to resolve the defintion from this, or upstream mirrors.
        {mixin, factory} = @_getMixinSpec name
        mixinOptions = instance.mixinOptions
        mixinDefaults = mixin.definition.mixinOptions
        extendMixinOptions mixinOptions, mixinDefaults

        # Complete the composition of the mixinOptions object by
        # extending a bare object with mixinDefaults.
        instance.mixinOptions = _.extend {}, mixinDefaults, mixinOptions

      # Invoke the mixin's mixconfig method if available, passing through
      # the mixinOptions object so that it can be modified by reference.
      @mixconfig instance, name, args for name in resolvedMixins

      # Finally, ensure the mixin(s) get initialized
      @mixinitialize instance, name for name in resolvedMixins

    # Handle Tags
    # -----------
    # Gets called when an object is created to wire the instance up with
    # all of it's tags. Any type that the object inherits from, any of those
    # types tags and any user defined tags are put into this list for use.

    handleTags: (name, instance, tags) ->
      delete instance.____tags

      # Create a map of all the places in the factory this instance is stored.
      factoryMap = [@instances[name]]

      # Create an empty entry in the tagMap, tagCallbacks array
      tags = instance.__tags()
      _.each tags, (tag) =>
        @tagMap[tag] ?= []
        @tagCallbacks[tag] ?= []
        @tagMap[tag].push instance
        factoryMap.push @tagMap[tag]

      instance.__factoryMap = -> _.uniq factoryMap

    # Mirror
    # ------
    # This is a wrapper for clone that keeps this factory synced with the
    # cloned factory. Useful for when you have need to clone a factory that
    # has asynchronous definitions.

    mirror: (factory) ->
      throw new TypeError '''
        Factory#mirror Invalid Argument.
        `factory` must be an instance of Factory.
      ''' unless factory instanceof Factory
      @mirrors.unshift factory
      @baseTags = _.chain(@baseTags)
        .union(factory.baseTags)
        .compact().uniq().value()

      # Push create, dispose events to upstream factories.
      @on 'create', -> factory.trigger 'create', arguments...
      @on 'dispose', -> factory.trigger 'dispose', arguments...

      # Listen for define, defibeNuxub events from upstream factories
      @listenTo factory, 'define', => @trigger 'define', arguments...
      @listenTo factory, 'defineMixin', => @trigger 'defineMixin', arguments...

    # Dispose
    # -------
    # Call this to remove the instance from the mirrors memory.
    # Note that this will destroy singletons allowing a singleton
    # object to be constructed again.

    dispose: (thing) ->
      return @disposeFactory unless thing?
      return @disposeFactory thing if thing instanceof Factory
      return @disposeInstance thing

    disposeInstance: (instance, options = {}) ->
      for array in instance.__factoryMap()
        if instance not in array
          return this if options.silent
          throw new ReferenceError """
            Factory#dispose Instance not in Factory.
            Instance does not exist in factory tagged with #{@baseTags}.
            Use `silent` option to ignore.
          """  and not options.silent
        while (index = array.indexOf(instance)) > -1
          array.splice index, 1
      @trigger 'dispose', instance

    disposeFactory: (factory = this) ->
      # TODO: Dispose factory

    # Verify Tags
    # -----------
    # An alias for verifyInstance.

    verifyTags: -> @verifyInstance arguments...

    # Verify Instance
    # ---------------
    # Verify that the instance is still managed by the factory.
    verifyInstance: (instance) ->
      return false unless factoryMap = instance.__factoryMap?()
      return _.all factoryMap, (arr) -> instance in arr

    # On Tag
    # ------
    # Call to run a function on all existing instances that relate to a tag and
    # bind that same function to any future instances created.

    onTag: (tag, callback) ->
      # Wat r u doin?
      throw new TypeError """
        Factory#onTag Invalid Argument.
        `tag` must be a String.
      """ unless _.isString tag

      # Nope.
      throw new TypeError """
        Factory#onTag Invalid Argument.
        `callback` must be a Function.
      """ unless _.isFunction callback

      # Recursively iterate over all instances and apply our callback.
      @_handleTagCallback tag, callback

      # Create a store for this callback if none exists.
      @tagCallbacks[tag] ?= []

      # Push our callback into the store.
      @tagCallbacks[tag].push callback

      return true

    # Handle Tag Callback
    # -------------------
    # Recursively iterate over all instances in all mirrored factories, applying
    # this callback to any instances with the desired tag.

    _handleTagCallback: (tag, callback) ->
      callback instance for instance in @tagMap[tag] or []
      factory._handleTagCallback tag, callback for factory in @mirrors

    # Off Tag
    # -------
    # Call to remove a function from calling on all future instances of an
    # instance that relates to a tag.

    offTag: (tag, callback) ->
      throw new TypeError """
        Factory#offTag Invalid Argument.
        `tag` must be a String.
      """ unless _.isString tag

      # Nothing in the callback stack? Nothing to do here...
      return if (callbacks = @tagCallbacks[tag])?.length < 1

      # Callback not provided, or not a function? Clean up all callbacks.
      return delete @tagCallbacks[tag] unless _.isFunction callback

      # User provided a callback to remove, but it doesn't exist? Oops.
      throw new ReferenceError """
        Factory#offTag Callback Not Found for #{tag}.
      """ if (index = callbacks.indexOf callback) < 0

      # Made it this far? Remove the callback.
      callbacks.splice index, 1

      # No callbacks left? Remove the array.
      delete @tagCallbacks[tag]
