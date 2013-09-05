(function() {
  require(["BackboneFactory", "backbone"], function(BackboneFactory, Backbone) {
    return describe("BackboneFactory", function() {
      it("should be available", function() {
        return expect(BackboneFactory).toBeDefined();
      });
      it("should return a default object when no valid definition is found", function() {
        expect(BackboneFactory.get("Base")).toBeDefined();
        return expect(BackboneFactory.get("Base").on).toBeDefined();
      });
      it("should initialize objects that support that interface", function() {
        var TestObject;
        TestObject = {
          initialize: function() {
            return this.tested = true;
          }
        };
        BackboneFactory.extend("Base", "TestObject", TestObject);
        return expect(BackboneFactory.get("TestObject")).toBeInstanceOf(BackboneFactory.definitions.Base.constructor);
      });
      it("should return a view as defined", function() {
        var view;
        view = BackboneFactory.get("View");
        return expect(view).toBeInstanceOf(Backbone.View);
      });
      describe("extend method", function() {
        BackboneFactory.extend("View", "Test.View", {
          el: "body",
          render: function() {
            return this.$el.append("<div class=\"test-item item-" + this.cid + "\">" + (new Date()).getTime() + "</div>");
          },
          model: "Test.Model"
        }, {
          singleton: true,
          mixins: ["one.View", "two.View"]
        });
        BackboneFactory.extend("Model", "Test.Model", {
          defaults: {
            hello: "world"
          },
          test: function() {
            return true;
          }
        }, {
          singleton: true
        });
        BackboneFactory.defineMixin("one.View", {
          mixinOptions: {
            one: true
          },
          mixinitialize: function() {
            return this.one = function() {
              return this.mixinOptions.one;
            };
          }
        });
        BackboneFactory.defineMixin("two.View", {
          mixinOptions: {
            two: true
          },
          mixinitialize: function() {
            return this.two = this.mixinOptions.two;
          }
        });
        it("should have extend method", function() {
          return expect(BackboneFactory).toProvideMethod("extend");
        });
        it("should return any model extended from the base", function() {
          var model;
          model = BackboneFactory.get("Test.Model");
          return expect(model.get("hello")).toEqual("world");
        });
        it("should have methods defined on the implementation", function() {
          var model;
          model = BackboneFactory.get("Test.Model");
          return expect(model.test()).toBe(true);
        });
        it("should support extended views with features", function() {
          var master;
          master = BackboneFactory.get("Test.View");
          master.render();
          expect($(".test-item").length).toBe(1);
          return expect(master.$el.get(0)).toEqual($("body").get(0));
        });
        return it("should include functionality and properties added by mixins", function() {
          var master;
          master = BackboneFactory.get("Test.View");
          expect(master.one()).toBe(true);
          return expect(master.two).toBe(true);
        });
      });
      describe("Model Support", function() {
        return describe("Clone override", function() {
          beforeEach(function() {
            return this.model = BackboneFactory.get('Model', {
              test: true
            });
          });
          afterEach(function() {
            BackboneFactory.dispose(this.model);
            return this.model = null;
          });
          return it("should allow cloning of models through the factory", function() {
            var disposeTest, model;
            model = this.model.clone();
            expect(model.get('test')).toBe(true);
            expect(BackboneFactory.verifyTags(model)).toBe(true);
            disposeTest = function() {
              return BackboneFactory.dispose(model);
            };
            return expect(disposeTest).not.toThrow();
          });
        });
      });
      return describe("Collection Support", function() {
        it("should support getting a standard collection", function() {
          var collection;
          collection = BackboneFactory.get("Collection", [1, 2, 3]);
          expect(collection).toBeDefined();
          return expect(collection).toBeInstanceOf(Backbone.Collection);
        });
        it("should support getting a collection referring to a factory model", function() {
          var collection;
          BackboneFactory.extend("Model", "FactoryModel", {
            test: function() {
              return true;
            }
          });
          BackboneFactory.extend("Collection", "FactoryCollection", {
            model: "FactoryModel"
          });
          collection = BackboneFactory.get("FactoryCollection", [{}, {}, {}]);
          expect(collection).toBeDefined();
          return collection.each(function(model) {
            return expect(model.test()).toBe(true);
          });
        });
        return describe("Clone override", function() {
          beforeEach(function() {
            return this.collection = BackboneFactory.get('Collection', [
              {
                id: 1
              }, {
                id: 2
              }, {
                id: 3
              }
            ]);
          });
          afterEach(function() {
            BackboneFactory.dispose(this.collection);
            return this.collection = null;
          });
          return it("should allow cloning of models through the factory", function() {
            var collection, disposeTest;
            collection = this.collection.clone();
            expect(collection.reduce(function(m, i) {
              expect(BackboneFactory.verifyTags(i)).toBe(true);
              return m += i.get("id");
            }, 0)).toBe(6);
            expect(BackboneFactory.verifyTags(collection)).toBe(true);
            disposeTest = function() {
              return BackboneFactory.dispose(collection);
            };
            return expect(disposeTest).not.toThrow();
          });
        });
      });
    });
  });

}).call(this);
