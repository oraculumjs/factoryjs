define [
  "Factory",
  "jquery",
  "underscore",
  "backbone"
], (Factory, $, _, Backbone) ->
  # Backbone Factory
  # ----------------
  # Returns a plain old object mixed with Backbone Event
  # as the default. You will probably just want to extend
  # the other objects defined below.

  BackboneFactory = new Factory (options) ->
    _.extend this, Backbone.Events
    @initialize.apply this, arguments  if _.isFunction @initialize

  # View
  # ----
  # You can extend or get views and if you want you can now
  # send in the model property as a string to get the model
  # from the factory. Also you can pass in modelData property
  # if you want to hydrate the model with some initial data.

  BackboneFactory.define "View", Backbone.View.extend
    initialize: (options) ->
      @model = @__factory().get @model, @modelData or {} if _.isString @model
      Backbone.View::initialize.apply this, arguments

  # Model
  # ----
  # You can extend or get models, no changes.

  BackboneFactory.define "Model", Backbone.Model

  # Collection
  # ----
  # You can extend or get collections and if you want you can now
  # send in the model property as a string to get the model constructor
  # from the factory.

  BackboneFactory.define "Collection", Backbone.Collection.extend
    initialize: (options) ->
      @model = @__factory().getConstructor @model  if _.isString @model
      Backbone.Collection::initialize.apply this, arguments

  # Router
  # ------
  # Plain old router.

  BackboneFactory.define "Router", Backbone.Router

  # History
  # -------
  # We statically add the history to the factory.

  BackboneFactory.history = Backbone.history
  BackboneFactory

