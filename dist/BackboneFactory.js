/* FactoryJS 1.1.8 */
(function() {
  define(["Factory", "backbone", "underscore"], function(Factory, Backbone, _) {
    'use strict';
    var BackboneFactory;
    BackboneFactory = new Factory((function() {
      return Backbone;
    }), {
      baseTags: ['Backbone']
    });
    BackboneFactory.define('BackboneFactory', (function() {
      return BackboneFactory;
    }), {
      singleton: true
    });
    BackboneFactory.define('View', Backbone.View.extend({
      constructor: function(options) {
        if (options == null) {
          options = {};
        }
        Backbone.View.prototype.constructor.apply(this, arguments);
        if (_.isString(this.model)) {
          this.model = this.__factory().get(this.model);
        }
        if (_.isString(this.collection)) {
          this.collection = this.__factory().get(this.collection);
        }
        return this;
      }
    }));
    BackboneFactory.define('Model', Backbone.Model);
    BackboneFactory.define('Collection', Backbone.Collection.extend({
      model: 'Model',
      constructor: function(models, options) {
        if (options == null) {
          options = {};
        }
        if (_.isString(this.model)) {
          this.model = this.__factory().getConstructor(this.model);
        }
        return Backbone.Collection.prototype.constructor.apply(this, arguments);
      }
    }));
    BackboneFactory.define("Router", Backbone.Router);
    BackboneFactory.history = Backbone.history;
    return BackboneFactory;
  });

}).call(this);
