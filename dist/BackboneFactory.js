/* FactoryJS 1.1.9 */
(function() {
  define(["Factory", "jquery", "backbone", "underscore"], function(Factory, jQuery, Backbone, _) {
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
    BackboneFactory.define('jQuery', (function() {
      return jQuery;
    }), {
      singleton: true,
      tags: ['vendor']
    });
    BackboneFactory.define('Backbone', (function() {
      return Backbone;
    }), {
      singleton: true,
      tags: ['vendor']
    });
    BackboneFactory.define('underscore', (function() {
      return _;
    }), {
      singleton: true,
      tags: ['vendor']
    });
    BackboneFactory.COMMIT = Factory.COMMIT;
    BackboneFactory.VERSION = Factory.VERSION;
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
