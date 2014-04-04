define [
  "Factory"
  "backbone"
  "underscore"
], (Factory, Backbone, _) ->
  'use strict'

  # Backbone Factory
  # ----------------
  # Returns a plain old object mixed with Backbone Event
  # as the default. You will probably just want to extend
  # the other objects defined below.

  BackboneFactory = new Factory (->
    _.extend this, Backbone.Events
    @initialize? arguments...
  ), baseTags: ['Backbone']

  # View
  # ----
  # You can extend or get views and if you want you can now
  # send in the model property as a string to get the model
  # from the factory. Also you can pass in modelData property
  # if you want to hydrate the model with some initial data.

  BackboneFactory.define 'View', Backbone.View.extend

    constructor: (options = {}) ->
      Backbone.View::constructor.apply this, arguments
      @model = @__factory().get @model if _.isString @model
      @collection = @__factory().get @collection if _.isString @collection
      return this

  # Model
  # ----
  # You can extend or get models, no changes.

  BackboneFactory.define 'Model', Backbone.Model.extend

    clone: -> @__factory().get @__type(), @attributes

  # Collection
  # ----
  # You can extend or get collections and if you want you can now
  # send in the model property as a string to get the model constructor
  # from the factory.

  BackboneFactory.define 'Collection', Backbone.Collection.extend
    model: 'Model'

    constructor: (models, options = {}) ->
      @model = @__factory().getConstructor @model if _.isString @model
      Backbone.Collection::constructor.apply this, arguments

    clone: -> @__factory().get @__type(), @models

  # Router
  # ------
  # Plain old router.

  BackboneFactory.define "Router", Backbone.Router

  # History
  # -------
  # We statically add the history to the factory.

  BackboneFactory.history = Backbone.history

  # Finally, return the object for use
  return BackboneFactory
