###
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
###

'use strict'

# Factory for object management
# -----------------------------

dfd = require('simply-deferred').Deferred
events = require 'events'
extend = require 'backbone-extend-standalone'

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

module.exports = class Factory extends events.EventEmitter

  _extend = (target, objects...) ->
    for obj in objects
      target[k] = v for k, v of obj
    return target

  _uniq = (arr) ->
    output = []
    for v in arr
      if -1 is output.indexOf v
        output.push v
    return output

  _compact = (arr) ->
    output = []
    for v in arr
      output.push v if v
    return output

  _each = (input, cb) ->
    if input instanceof Array
    then cb v for v in input
    else cb v, k for k, v of input

  _omit = (input, omissions...) ->
    output = null
    if input instanceof Array
      output = []
      for v in input
        output.push v unless v in omissions
    else
      output = {}
      for k, v of input
        output[k] = v unless k in omissions
    return output

  _toArray = (input) ->
    output = []
    return output unless input
    return input.slice() if input instanceof Array
    output.push v for k, v of input
    return output

  # Provide a utility for shallow extension of the mixinOptions object.
  # This method only supports certain primitives for extension by design.
  extendMixinOptions = (mixinOptions = {}, mixinDefaults = {}) ->
    _isElement = (obj) -> return obj?.nodeType is 1

    for option, defaultValue of mixinDefaults
      value = mixinOptions[option] ?= defaultValue

      # Don't do anything if either value is not an object
      isObject = typeof value is 'object' or typeof defaultValue is 'object'
      continue unless isObject

      # Don't do anything if either object is a type we don't support
      continue if value instanceof Date or defaultValue instanceof Date or
      _isElement value or _isElement defaultValue or
      typeof value is 'function' or typeof defaultValue is 'function' or
      value instanceof RegExp or defaultValue instanceof RegExp

      # If it's an array, concat the values
      if value instanceof Array or defaultValue instanceof Array
        mixinOptions[option] = value.concat defaultValue
        continue

      # Lastly, if it's a bare object, extend it
      mixinOptions[option] = _extend {}, defaultValue, value

    return #nop

# Constructor
# -----------
# It only takes one argument, the base class implementation
# to use as a default. It becomes the 'Base' type, you can extend.
  constructor: (Base, options = {}) ->
    @mixins = {}
    @mixinSettings = {}

    @tagCbs = {}
    @tagMap = {}

    @promises = {}
    @instances = {}
    @definitions = {}

    # Define our base object if it exists and apply our base tags.
    @define 'Base', Base or -> this
    @baseTags = options.baseTags or []

    # Listen for create events.
    @on 'create', @handleCreate, this

  # Define
  # ------
  # Use the define method to define a new type (constructor) in the
  # factory.

  define: (name, def, options = {}) ->
    if @definitions[name]? and not options.override
      return this if options.silent
      message = """
        Definition already exists [#{name}] use the override option to ignore
      """
      throw new Error message

    # whenDefined support.
    @promises[name] ?= dfd()
    definition = { options }

    # we borrow extend from Backbone unless you brought your own.
    def.extend = extend unless def and typeof def.extend is 'function'

    # we will store an object instead of a function if that is what you need.
    if typeof def is 'function'
    then definition.constructor = def
    else definition.constructor = -> _extend {}, def
    definition.constructor.prototype.__factory = => this

    # tag support
    tags = [name].concat(options.tags).concat @baseTags
    definition.tags = _uniq _compact tags

    @instances[name] = []
    _each definition.tags, (tag) =>
      @tagMap[tag] = @tagMap[tag] or []
      @tagCbs[tag] = @tagCbs[tag] or []

    @definitions[name] = definition
    # if you need to know when a type is defined you can listen to
    # the define event on the factory or ask using whenDefined.
    @emit 'define', name, definition, options
    @promises[name].resolve this, name
    return this

  # Has Definition
  # --------------
  # Find out if the factory already has a definition by name.

  hasDefinition: (name) ->
    return Boolean @definitions[name]

  # When Defined
  # ------------
  # Find out when a definition has been loaded into the factory
  # by name. This returns a promise object.

  whenDefined: (name) ->
    return @promises[name] ?= dfd()

  # Fetch Definition
  # ----------------
  # Fetch a definition from the server and callback when done
  #
  #     WARNING! this will not work with jquery or other polymorphic
  #     function API's. It expects functions to be constructors!

  fetchDefinition: (name, module = name) ->
    promise = @whenDefined name
    callback = (def) => @define name, def unless @hasDefinition name
    if typeof define is 'function' and define.amd
    then require [module], callback
    else callback require module
    return promise

  # Extend
  # ------
  # Use extend to define a new type that extends another type in the
  # factory. It basically uses Backbone.Model.extend unless you provide
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
    """ unless typeof def is 'object'

    tags = [].concat(options.tags).concat(bDef.tags)
    options.tags = _uniq _compact tags

    if options.inheritMixins
      mixins = [].concat(bDef.options.mixins).concat(options.mixins)
      options.mixins = _uniq _compact mixins
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
    throw new Error '''
      Invalid Argument :: Expected Factory
    ''' unless factory instanceof Factory

    singletonDefinitions = []
    _each ["definitions", "mixins", "promises", "mixinSettings"], (key) =>
      @[key] = _extend {}, factory[key], @[key]
      if key is 'definitions'
        _each @[key], (def, defname) =>
          singletonDefinitions.push defname if def.options.singleton
          @[key][defname].constructor.prototype.__factory = => this

    _each ["tagCbs","tagMap","promises","instances"], (key) =>
      @[key] ?= {}
      for name, payload of factory[key]
        if key is 'instances' and name in singletonDefinitions
          singleton = true
        if payload instanceof Array
          @[key][name] ?= []
          if singleton
          then @[key][name] = @[key][name]
          else @[key][name] = payload.concat(@[key][name])
        if payload and typeof payload.resolve is 'function'
          @[key][name] ?= dfd()
          @[key][name].done(payload.resolve)

  # Mirror
  # ------
  # This is a wrapper for clone that keeps this factory synced with the
  # cloned factory. Useful for when you have need to clone a factory that
  # has asynchronous definitions.

  mirror: (factory) ->
    factory.removeListener 'create', factory.handleCreate

    _each this, (member, memberName) =>
      return unless typeof member is 'function'
      factory[memberName] = => @[memberName] arguments...

    @clone factory

    _each factory, (member, memberName) ->
      return if typeof member is 'function'
      delete factory[memberName]

  # Define Mixin
  # ------------
  # Use defineMixin to add mixin definitions to the factory. You can
  # use these definitions in the define and extend method by adding
  # a mixins array option with the names of the mixins to include.

  defineMixin: (name, def, options = {}) ->
    throw new Error """
      Mixin already defined :: #{name} :: use override option to ignore
    """ if @mixins[name]? and not options.override
    @mixins[name] = def
    @mixinSettings[name] = options
    @emit 'defineMixin', name, def, options
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
    return _uniq result

  # Compose Mixin Options
  # ---------------------
  # By introducing mixin inheritence we inadvertently made the possible
  # option sets way more complicated since a mixin can depend on another
  # mixin and give some defaults that should override the depended mixins
  # defaults.

  composeMixinOptions: (instance, mixinName, args) ->
    mixin = @mixins[mixinName]
    mixinDefaults = mixin.mixinOptions
    mixinOptions = instance.mixinOptions
    extendMixinOptions mixinOptions, mixinDefaults

    # Invoke the mixin's mixconfig method if available, passing through
    # the mixinOptions object so that it can be modified by reference.
    mixin.mixconfig? mixinOptions, args...

    # Finally, complete the composition of the mixinOptions object by
    # extending a bare object with mixinDefaults and whatever custom
    # options the mixconfig method may have assigned before assigning
    # it back onto the instance.
    instance.mixinOptions = _extend {}, mixinDefaults, mixinOptions

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

    props = _omit mixin, 'mixinOptions', 'mixinitialize', 'mixconfig'
    _extend instance, props

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
    mixinitialize.call instance if typeof mixinitialize is 'function'

  # Handle Mixins
  # -------------
  # Gets called when an object is created to mixin anything you said
  # to include in the definition. If the mixin defines a mixinitialize
  # method it will get called after initialize and before constructed.

  handleMixins: (instance, mixins, args) ->
    instance.____mixed = []

    # clone the instance's mixinOptions to avoid overwriting the defaults

    instance.mixinOptions = _extend {}, instance.mixinOptions

    resolvedMixins = @composeMixinDependencies mixins

    instance.__mixins = ->
      resolvedMixins.slice()

    @applyMixin instance, mixinName for mixinName in resolvedMixins

    # because it considers instance.mixinOptions to be canonical
    # this needs to execute in reverse order so higher level mixins
    # take configuration precedence.

    reverseMixins = resolvedMixins.slice().reverse()
    for mixinName in reverseMixins
      @composeMixinOptions instance, mixinName, args

    @mixinitialize instance, mixinName for mixinName in resolvedMixins

    instance.__mixin = ((instance) => (mixin, mixinOptions) =>
      instance.____mixed = []
      @handleMixins instance, [mixin], mixinOptions
      delete instance.____mixed
    )(instance)

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
        cb instance if typeof cb is 'function'
    return true

  # Handle Tags
  # -----------
  # Gets called when an object is created to wire the instance up with
  # all of it's tags. Any type that the object inherits from, any of those
  # types tags and any user defined tags are put into this list for use.

  handleTags: (name, instance, tags) ->
    @instances[name].push instance
    fullTags = _toArray(tags).concat(instance.____tags or [])
    delete instance.____tags if instance.____tags
    instance.__tags = -> _toArray fullTags

    factoryMap = [@instances[name]]
    for tag in fullTags
      @tagMap[tag] = [] unless @tagMap[tag]?
      @tagMap[tag].push instance
      factoryMap.push @tagMap[tag]
    factoryMap = _uniq(factoryMap)
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
    instance.constructed args... if typeof instance.constructed is 'function'

    # we shortcut the dispose functionality so we can wire it into other
    # frameworks and stuff easily
    instance.__dispose = ((factory) ->
      return -> factory.dispose this
    )(this)

    # we trigger a create event on the factory so we can handle tag listeners
    # but the user can use this for other purposes as well.
    @emit 'create', instance

    return instance

  # Verify Tags
  # -----------
  # Call this to make sure that the instance hasn't yet been disposed. If it
  # hasn't been disposed this will return true, otherwise return false.

  verifyTags: (instance) ->
    return false unless instance.__factoryMap
    for arr in instance.__factoryMap()
      return false unless instance in arr
    return true

  # Dispose
  # -------
  # Call this to remove the instance from the factories memory.
  # Note that this will destroy singletons allowing a singleton
  # object to be constructed again.

  dispose: (instance) ->
    _each instance.__factoryMap(), (arr) ->
      message = "Instance Not In Factory :: #{instance} :: disposal failed!"
      throw new Error message if instance not in arr
      while arr.indexOf(instance) > -1
        arr.splice arr.indexOf(instance), 1
    @emit 'dispose', instance

  # Get Constructor
  # ---------------
  # This allows you to use the factory in contexts where a constructor
  # function is expected. The instances returned from this constructor will
  # support all the functionality of the factory including mixins, tags and
  # singleton. Optionally you can pass in the original flag to get the
  # original constructor method. Use this for instance of checks.

  getConstructor: (name, original = false) ->
    return @definitions[name].constructor if original
    result = ((name) => => @get name, arguments...)(name)
    result.prototype = @definitions[name].constructor.prototype
    return result

  # On Tag
  # ------
  # Call to run a function on all existing instances that relate to a tag and
  # bind that same function to any future instances created.

  onTag: (tag, cb) ->
    message = "Invalid Argument :: #{typeof tag} provided :: expected String"
    throw new Error message unless typeof tag is 'string'
    message = "Invalid Argument :: #{typeof cb} provided :: expected Function"
    throw new Error message unless typeof cb is 'function'
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
    throw new Error message unless typeof tag is 'string'
    return unless @tagCbs[tag]?
    unless typeof cb is 'function'
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
