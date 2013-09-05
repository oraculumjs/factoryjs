(function() {
  define(["Factory", "jquery", "underscore", "backbone"], function(Factory, $, _, Backbone) {
    var BackboneFactory;
    BackboneFactory = new Factory(function(options) {
      _.extend(this, Backbone.Events);
      if (_.isFunction(this.initialize)) {
        return this.initialize.apply(this, arguments);
      }
    });
    BackboneFactory.define("View", Backbone.View.extend({
      initialize: function(options) {
        if (_.isString(this.model)) {
          this.model = this.__factory().get(this.model, this.modelData || {});
        }
        return Backbone.View.prototype.initialize.apply(this, arguments);
      }
    }));
    BackboneFactory.define("Model", Backbone.Model.extend({
      clone: function() {
        var factory;
        factory = this.__factory();
        return factory.get(factory.getType(this), this.attributes);
      }
    }));
    BackboneFactory.define("Collection", Backbone.Collection.extend({
      model: 'Model',
      initialize: function(options) {
        if (_.isString(this.model)) {
          this.model = this.__factory().getConstructor(this.model);
        }
        return Backbone.Collection.prototype.initialize.apply(this, arguments);
      },
      clone: function() {
        var factory;
        factory = this.__factory();
        return factory.get(factory.getType(this), this.models);
      }
    }));
    BackboneFactory.define("Router", Backbone.Router);
    BackboneFactory.history = Backbone.history;
    return BackboneFactory;
  });

}).call(this);
