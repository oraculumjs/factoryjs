(function() {
  require(["Factory"], function(Factory) {
    return describe("Factory", function() {
      it("should exist when referenced", function() {
        return expect(Factory).toBeDefined();
      });
      it("should allow the creation of a new Factory", function() {
        var factory;
        factory = new Factory(function() {
          return this.x = true;
        });
        return expect(factory).toBeDefined();
      });
      it('should allow the baseTags property to be set in the constructor', function() {
        var baseTags, factory;
        baseTags = ['BaseTag1', 'BaseTag2'];
        factory = new Factory((function() {}), {
          baseTags: baseTags
        });
        return expect(factory.baseTags).toBe(baseTags);
      });
      return describe("factory instance", function() {
        var factory;
        factory = null;
        beforeEach(function() {
          return factory = new Factory((function() {
            this.x = true;
            return this.y = false;
          }), {
            baseTags: ['BaseTag1', 'BaseTag2']
          });
        });
        describe("define method", function() {
          var trigger;
          trigger = null;
          beforeEach(function() {
            trigger = sinon.stub(factory, 'trigger');
            return factory.define("test", function() {
              return this.test = true;
            });
          });
          afterEach(function() {
            return trigger.restore();
          });
          it("should provide define method", function() {
            return expect(factory).toProvideMethod("define");
          });
          it("should add a definition when define is called", function() {
            return expect(factory.definitions.test).toBeDefined();
          });
          it("should accept an object as the definition", function() {
            factory.define('Object', {
              test: true,
              singleton: true
            });
            return expect(factory.get('Object').test).toBe(true);
          });
          it("should throw if a definition is already defined", function() {
            var test;
            test = function() {
              return factory.define("test", function() {
                return this.test = false;
              });
            };
            return expect(test).toThrow();
          });
          it("should not throw if already defined with silent options", function() {
            var test;
            test = function() {
              return factory.define("test", (function() {
                return this.test = false;
              }), {
                silent: true
              });
            };
            return expect(test).not.toThrow();
          });
          it('should concat @baseTags into options.tags', function() {
            factory.define('test', {}, {
              override: true
            });
            expect(factory.definitions.test.tags).toContain('BaseTag1');
            return expect(factory.definitions.test.tags).toContain('BaseTag2');
          });
          it("should trigger an event", function() {
            var test;
            expect(trigger).toHaveBeenCalledOnce();
            test = factory.definitions.test;
            return expect(trigger).toHaveBeenCalledWith('define', 'test', test);
          });
          return it("should allow override of a definition with override flag", function() {
            var t, test;
            test = function() {
              return factory.define("test", function() {
                return this.test = this;
              }, {
                override: true
              });
            };
            expect(test).not.toThrow();
            t = factory.get('test');
            return expect(t.test).toEqual(t);
          });
        });
        describe("hasDefinition method", function() {
          beforeEach(function() {
            return factory.define("test", function() {
              return this.test = true;
            });
          });
          it("should provide hasDefinition method", function() {
            return expect(factory).toProvideMethod("hasDefinition");
          });
          it("should provide hasDefinition method", function() {
            return expect(factory).toProvideMethod("hasDefinition");
          });
          return it("should indicate that a definition has been created", function() {
            expect(factory.hasDefinition("test")).toBe(true);
            return expect(factory.hasDefinition("nottest")).toBe(false);
          });
        });
        describe("whenDefined method", function() {
          it("should provide a whenDefined method", function() {
            return expect(factory).toProvideMethod('whenDefined');
          });
          it("should return a promise", function() {
            return expect(factory.whenDefined('SomeObject')).toBePromise();
          });
          return it("should resolve the promise when the definition is provided", function() {
            var n, promise;
            n = false;
            promise = factory.whenDefined('SomeObject');
            promise.done(function(f, name) {
              return n = {
                factory: f,
                name: name
              };
            });
            factory.define('SomeObject', {
              test: true
            });
            waitsFor(function() {
              return n;
            });
            return runs(function() {
              expect(n.factory).toEqual(factory);
              return expect(n.name).toEqual('SomeObject');
            });
          });
        });
        describe("fetchDefinition method", function() {
          it("should provide fetchDefinition method", function() {
            return expect(factory).toProvideMethod('fetchDefinition');
          });
          it("should return a promise when called", function() {
            return expect(factory.fetchDefinition('Factory')).toBePromise();
          });
          return it("should resolve the promise when the definition gets retrieved", function() {
            var n;
            n = false;
            waitsFor(function() {
              return n;
            });
            runs(function() {
              expect(factory.hasDefinition('Factory')).toBe(true);
              return expect(n).toEqual(factory);
            });
            return factory.fetchDefinition('Factory').done(function(f) {
              return n = f;
            });
          });
        });
        describe("defineMixin method", function() {
          var mixin, trigger;
          trigger = mixin = null;
          beforeEach(function() {
            mixin = {
              'test': 'test'
            };
            trigger = sinon.stub(factory, 'trigger');
            return factory.defineMixin("test", mixin, {
              mixins: ['test1'],
              tags: ['test1']
            });
          });
          it("should provide defineMixin method", function() {
            return expect(factory).toProvideMethod("defineMixin");
          });
          it("should have the defined mixins", function() {
            return expect(factory.mixins.test).toBeDefined();
          });
          it("should have the defined mixin dependency", function() {
            return expect(factory.mixinSettings.test.mixins).toEqual(['test1']);
          });
          it("should have the defined mixin tags", function() {
            return expect(factory.mixinSettings.test.tags).toEqual(['test1']);
          });
          it("should throw if that mixin is already defined", function() {
            var test;
            test = function() {
              return factory.defineMixin('test', mixin);
            };
            return expect(test).toThrow();
          });
          it("should allow overriding a mixin with appropriate flag", function() {
            var test;
            test = function() {
              return factory.defineMixin('test', mixin, {
                override: true
              });
            };
            return expect(test).not.toThrow();
          });
          return it('should trigger an event', function() {
            expect(trigger).toHaveBeenCalledOnce();
            return expect(trigger).toHaveBeenCalledWith('defineMixin', 'test', mixin);
          });
        });
        describe("get method", function() {
          var Test;
          Test = function(options) {
            this.initialize(options);
            return this;
          };
          Test.prototype = {
            initialize: function(options) {
              var option;
              for (option in options) {
                this[option] = options[option];
              }
              return this;
            },
            constructed: sinon.stub()
          };
          beforeEach(function() {
            factory.defineMixin("one", {
              one: true
            });
            factory.defineMixin("two", {
              mixinitialize: function() {
                return this.two = true;
              }
            });
            factory.defineMixin("three", {
              mixinitialize: function() {
                return this.three = true;
              }
            });
            factory.defineMixin("four", {
              mixinitialize: function() {
                return this.four = true;
              }
            }, {
              mixins: ['three']
            });
            return factory.define("Test", Test, {
              singleton: true,
              mixins: ["one", "two"]
            });
          });
          it("should provide get method", function() {
            return expect(factory).toProvideMethod("get");
          });
          it("should provide a factory retrieval method on an instance", function() {
            var test;
            test = factory.get("Test", {});
            return expect(test.__factory()).toEqual(factory);
          });
          it("should return the appropriate object instance", function() {
            return expect(factory.get("Test", {})).toBeInstanceOf(Test);
          });
          it("should return a singleton if that is the option passed", function() {
            return expect(factory.get("Test")).toEqual(factory.get("Test"));
          });
          it("should mixin any requested mixins", function() {
            var test;
            test = factory.get("Test");
            expect(test.one).toBe(true);
            return expect(test.two).toBe(true);
          });
          it("should throw if you provide in invalid mixin", function() {
            var tester;
            factory.define('BadMixin', function() {
              return this.herp = true;
            }, {
              mixins: ["Doesn't Exist"]
            });
            tester = function() {
              return factory.get('BadMixin');
            };
            return expect(tester).toThrow();
          });
          it("should support late mixing via the apply mixin method", function() {
            var t;
            t = factory.get("Test", {});
            factory.applyMixin(t, 'three');
            return expect(t.three).toBe(true);
          });
          it("should support mixin dependencies", function() {
            var t;
            t = factory.get("Test", {});
            t.__mixin('four');
            expect(t.three).toBe(true);
            return expect(t.four).toBe(true);
          });
          it("should throw if an invalid definition is referenced", function() {
            var tester;
            tester = function() {
              return factory.get('Invalid.Object');
            };
            return expect(tester).toThrow();
          });
          it("should have invoked the constructed method at invocation time", function() {
            var test;
            test = factory.get("Test", 1, 2, 3);
            return expect(test.constructed).toHaveBeenCalled();
          });
          it("should invoke constructed method with args from constructor", function() {
            var test;
            test = factory.get("Test", 1, 2, 3);
            return expect(test.constructed).toHaveBeenCalledWith(1, 2, 3);
          });
          return it("should invoke constructed method with the instance context", function() {
            var test;
            test = factory.get("Test", 1, 2, 3);
            return expect(test.constructed).toHaveBeenCalledOn(test);
          });
        });
        describe("mixinOptions special cases", function() {
          beforeEach(function() {
            factory.defineMixin('one', {
              mixinOptions: {
                one: {
                  test: false,
                  flat: false
                },
                two: {
                  test: false,
                  flat: false
                }
              }
            }, {
              mixins: ['two']
            });
            factory.defineMixin('two', {
              mixinOptions: {
                two: {
                  test: true,
                  flat: true
                }
              }
            });
            factory.define('MixedObject', function(options) {
              return this.options = function() {
                return options;
              };
            }, {
              mixins: ['one']
            });
            return factory.define('RemixedObject', function(options) {
              return this.options = function() {
                return options;
              };
            }, {
              mixins: ['two']
            });
          });
          it("should have the right mixinOptions", function() {
            var mixed;
            mixed = factory.get('MixedObject');
            expect(mixed.mixinOptions.one.test).toBe(false);
            return expect(mixed.mixinOptions.two.test).toBe(false);
          });
          return it("should support single depth mixinOptions", function() {
            var remixed;
            remixed = factory.get('RemixedObject');
            return expect(remixed.mixinOptions.two.test).toBe(true);
          });
        });
        describe("Definition mixin special cases", function() {
          beforeEach(function() {
            this.date = new Date();
            this.fn = function() {};
            factory.defineMixin('InheritedMixin', {
              center: true
            }, {
              mixins: null
            });
            factory.extend('Base', 'MixinObject', {
              mixinOptions: {
                inherited: {
                  left: true
                },
                test: [1],
                fn: this.fn
              }
            }, {
              mixins: ['InheritedMixin']
            });
            factory.extend('MixinObject', 'InheritedMixinObject', {
              mixinOptions: {
                inherited: {
                  right: true
                },
                test: [2],
                date: this.date
              }
            }, {
              mixins: null,
              inheritMixins: true
            });
            factory.extend('MixinObject', 'BadMixinObject', {
              mixinOptions: null,
              mixconfig: function() {
                return {
                  derp: 'herp'
                };
              }
            }, {
              mixins: ['DoesntExist']
            });
            this.object = factory.get('InheritedMixinObject');
            return this.failTest = function() {
              return factory.get('BadMixinObject');
            };
          });
          it("should contain the expected mixinOptions", function() {
            expect(this.object.mixinOptions.inherited.right).toBe(true);
            return expect(this.object.mixinOptions.inherited.left).toBe(true);
          });
          it("should extend array mixinOptions", function() {
            expect(this.object.mixinOptions.test).toContain(1);
            return expect(this.object.mixinOptions.test).toContain(2);
          });
          it("should just keep the newest for other types", function() {
            expect(this.object.mixinOptions.date).toBe(this.date);
            return expect(this.object.mixinOptions.fn).toBe(this.fn);
          });
          it("should inherit mixins when the inheritMixins flag is true", function() {
            return expect(this.object.center).toBe(true);
          });
          it("should give back mixins when __mixins method is invoked", function() {
            return expect(this.object.__mixins()).toContain('InheritedMixin');
          });
          return it("should throw if the mixin isn't defined", function() {
            return expect(this.failTest).toThrow();
          });
        });
        describe("getConstructor method", function() {
          beforeEach(function() {
            return factory.define("ConstructorTest", function(options) {
              this.x = true;
              return this.y = options.y;
            });
          });
          it("should return a function", function() {
            return expect(factory.getConstructor("ConstructorTest")).toBeFunction();
          });
          it("should attach the correct prototype to the function returned", function() {
            var cptype, ptype;
            cptype = factory.getConstructor('ConstructorTest').prototype;
            ptype = factory.definitions.ConstructorTest.constructor.prototype;
            return expect(cptype).toBe(ptype);
          });
          describe("optional original argument", function() {
            return it("should return the original constructor", function() {
              var ctor, obj;
              ctor = factory.getConstructor("ConstructorTest", true);
              obj = factory.get("ConstructorTest", {
                y: true
              });
              return expect(obj).toBeInstanceOf(ctor);
            });
          });
          it("should create the expected object when invoked", function() {
            var ctor, obj;
            ctor = factory.getConstructor("ConstructorTest");
            obj = new ctor({
              y: false
            });
            expect(obj.x).toBe(true);
            return expect(obj.y).toBe(false);
          });
          it("should create the expected type of object", function() {
            var ctor, fctor, obj;
            ctor = factory.getConstructor("ConstructorTest", true);
            fctor = factory.getConstructor("ConstructorTest");
            obj = new fctor({
              y: false
            });
            return expect(obj).toBeInstanceOf(ctor);
          });
          it("should support singletons", function() {
            var ctor;
            factory.define("SingletonTest", (function() {
              this.x = true;
              return this.y = false;
            }), {
              singleton: true
            });
            ctor = factory.getConstructor("SingletonTest");
            return expect(new ctor()).toEqual(new ctor());
          });
          return it("should support mixins", function() {
            var ctor;
            factory.defineMixin("Mixin.One", {
              mixinitialize: function() {
                return this.mixedin = true;
              }
            });
            factory.define("MixinTest", function() {
              return this.mixedin = false;
            }, {
              mixins: ["Mixin.One"]
            });
            ctor = factory.getConstructor("MixinTest");
            return expect((new ctor()).mixedin).toBe(true);
          });
        });
        describe("Extend", function() {
          it("should add extend capability to any constructor", function() {
            var ExtendTest;
            factory.define("ExtendTest", ExtendTest = function(options) {
              return this.test = true;
            });
            factory.extend("ExtendTest", "ExtendedObject", {
              testHandler: function() {
                return this.test;
              }
            });
            expect(factory.get("ExtendedObject").test).toBe(true);
            return expect(factory.get("ExtendedObject").testHandler()).toBe(true);
          });
          it("should throw if an invalid base class is presented", function() {
            var tester;
            tester = function() {
              return factory.extend('InvalidClass', 'OtherClass', {});
            };
            return expect(tester).toThrow();
          });
          return it("should throw if an invalid definition is presented", function() {
            var tester;
            tester = function() {
              return factory.extend('Base', 'NewThing', false);
            };
            return expect(tester).toThrow();
          });
        });
        describe("Clone", function() {
          beforeEach(function() {
            this.clonedFactory = new Factory(function() {
              return this.cloned = true;
            });
            this.clonedFactory.define('Test.Util', (function() {}), {
              singleton: true,
              override: true
            });
            this.clonedFactory.get('Test.Util');
            factory.define('Test.Util', (function() {}), {
              singleton: true,
              override: true
            });
            return factory.get('Test.Util');
          });
          it("shoud throw when an invalid factory is passed", function() {
            var test;
            test = function() {
              return factory.clone({});
            };
            return expect(test).toThrow();
          });
          it("should support cloning of the factory", function() {
            factory.define('Test', {
              test: true
            });
            this.clonedFactory.clone(factory);
            return expect(this.clonedFactory).not.toEqual(factory);
          });
          it("should retain it's own core implementations", function() {
            var test1, test2;
            this.clonedFactory.clone(factory);
            test1 = factory.get('Base');
            test2 = this.clonedFactory.get('Base');
            expect(test1.cloned).not.toBeDefined();
            return expect(test2.cloned).toBe(true);
          });
          it("should support getting definitions from the cloned factory", function() {
            var test;
            factory.define('Test', {
              test: true
            });
            this.clonedFactory.clone(factory);
            expect(this.clonedFactory.hasDefinition('Test')).toBe(true);
            test = this.clonedFactory.get('Test', {});
            return expect(test).toBeDefined();
          });
          it("should have it's own definition hash as well", function() {
            factory.define('Test', {
              test: true
            });
            this.clonedFactory.clone(factory);
            this.clonedFactory.define('NewTest', {
              test: true
            });
            expect(this.clonedFactory.hasDefinition('NewTest')).toBe(true);
            return expect(factory.hasDefinition('NewTest')).toBe(false);
          });
          it("should share an instance pool with it's clone", function() {
            var test1;
            factory.define('Test', {
              test: true
            });
            this.clonedFactory.clone(factory);
            test1 = factory.get('Test');
            return expect(this.clonedFactory.instances['Test']).toBeDefined();
          });
          it("should reattach any instance factory accessors to itself", function() {
            var test1, test2;
            this.clonedFactory.clone(factory);
            test1 = factory.get('Base');
            test2 = this.clonedFactory.get('Base');
            expect(test1.__factory()).toEqual(factory);
            return expect(test2.__factory()).toEqual(this.clonedFactory);
          });
          it("should share any onTag events", function() {
            var method;
            method = function() {};
            factory.onTag('Test', method);
            this.clonedFactory.clone(factory);
            return expect(this.clonedFactory.tagCbs['Test']).toContain(method);
          });
          it("should share any define promises", function() {
            var method, promise;
            method = function() {};
            promise = factory.whenDefined('DeferredTest');
            this.clonedFactory.clone(factory);
            this.clonedFactory.promises['DeferredTest'];
            return expect(this.clonedFactory.promises['DeferredTest'].state()).toBe('pending');
          });
          return it("should maintain the singleton status of cloned instances", function() {
            this.clonedFactory.clone(factory);
            return expect(this.clonedFactory.instances['Test.Util'].length).toBe(1);
          });
        });
        describe('mirror method', function() {
          var base, clone, m, methods;
          base = clone = m = null;
          methods = ["define", "hasDefinition", "whenDefined", "fetchDefinition", "extend", "mirror", "defineMixin", "composeMixinDependencies", "composeMixinOptions", "applyMixin", "mixinitialize", "handleMixins", "handleInjections", "handleCreate", "handleTags", "get", "verifyTags", "dispose", "getConstructor", "onTag", "offTag", "isType", "getType"];
          beforeEach(function() {
            base = new Factory(function() {
              return {};
            });
            clone = sinon.stub(factory, 'clone');
            factory.mirror(base);
            return m = {};
          });
          afterEach(function() {
            return clone.restore();
          });
          it('should invoke clone', function() {
            expect(clone).toHaveBeenCalledOnce();
            return expect(clone).toHaveBeenCalledWith(base);
          });
          return _.each(methods, function(method) {
            return describe("" + method + " shadow", function() {
              beforeEach(function() {
                m[method] = sinon.stub(factory, method);
                return base[method]('test');
              });
              afterEach(function() {
                return m[method].restore();
              });
              return it("should bind " + method + " to factory", function() {
                expect(m[method]).toHaveBeenCalledOnce();
                return expect(m[method]).toHaveBeenCalledWith('test');
              });
            });
          });
        });
        return describe("Factory Instance Mapping", function() {
          var lso;
          lso = void 0;
          beforeEach(function() {
            factory.defineMixin('TagMixin', {}, {
              tags: ['MixedInto']
            });
            factory.define("SimpleObject", (function() {
              return this.isSimple = true;
            }), {
              tags: ["NotSoSimple", "KindaComplicated"]
            });
            factory.extend("SimpleObject", "LessSimpleObject", {
              isThisSiple: function() {
                return !this.isSimple;
              }
            }, {
              mixins: ['TagMixin'],
              tags: ["Difficult"]
            });
            return lso = factory.get("LessSimpleObject");
          });
          it("should have the right tags in memory", function() {
            expect(lso.__tags()).toContain('MixedInto');
            expect(lso.__tags()).toContain('Difficult');
            expect(lso.__tags()).toContain('NotSoSimple');
            expect(lso.__tags()).toContain('KindaComplicated');
            return expect(lso.__tags()).toContain('SimpleObject');
          });
          it("should be able to verify an instance map", function() {
            return expect(factory.verifyTags(lso)).toBe(true);
          });
          it("should be able to dispose of an instance", function() {
            factory.dispose(lso);
            return expect(factory.verifyTags(lso)).toBe(false);
          });
          it("should provide a dispose shortcut on the instance", function() {
            lso.__dispose();
            return expect(factory.verifyTags(lso)).toBe(false);
          });
          it("should throw if dispose is called with an invalid instance", function() {
            var tester;
            factory.dispose(lso);
            tester = function() {
              return factory.dispose(lso);
            };
            return expect(tester).toThrow();
          });
          describe("onTag", function() {
            var instances;
            instances = void 0;
            beforeEach(function() {
              return instances = _.range(0, 5).map(function() {
                return factory.get("LessSimpleObject");
              });
            });
            afterEach(function() {
              return _.invoke(instances, "__dispose");
            });
            it("should support adding tag callbacks for tags not defined yet", function() {
              var tester;
              tester = function() {
                return factory.onTag('NonExistant.Tag', function(instance) {
                  return instance.test = true;
                });
              };
              return expect(tester).not.toThrow();
            });
            it("should provide a method for modifying all instances of a tag", function() {
              return expect(factory).toProvideMethod("onTag");
            });
            it("should throw if insufficient arguments", function() {
              var insufficientArgs;
              insufficientArgs = function() {
                return factory.onTag();
              };
              return expect(insufficientArgs).toThrow();
            });
            it("should throw if non string tag passed", function() {
              var invalidArgs;
              invalidArgs = function() {
                return factory.onTag(function() {
                  return null;
                }, null);
              };
              return expect(invalidArgs).toThrow();
            });
            it("should throw if non function callback passed", function() {
              var invalidArgs;
              invalidArgs = function() {
                return factory.onTag('LessSimpleObject', [1, 2, 3]);
              };
              return expect(invalidArgs).toThrow();
            });
            it("should call the callback on all existing instances", function() {
              factory.onTag("SimpleObject", function(instance) {
                return instance.test = true;
              });
              return expect(_.chain(instances).pluck("test").all().value()).toBe(true);
            });
            it("should call the callback on any matching tags", function() {
              var reset;
              reset = function() {
                return _.each(instances, function(i) {
                  return i.test = false;
                });
              };
              return _.each(["NotSoSimple", "KindaComplicated", "LessSimpleObject", "Difficult", "MixedInto"], function(tag) {
                factory.onTag(tag, function(i) {
                  return i.test = true;
                });
                expect(_.chain(instances).pluck("test").all().value()).toBe(true);
                return reset();
              });
            });
            return it("should call the callback on any future instances", function() {
              _.each(["SimpleObject", "NotSoSimple", "KindaComplicated", "LessSimpleObject", "Difficult", "MixedInto"], function(tag) {
                return factory.onTag(tag, function(i) {
                  return i.test = true;
                });
              });
              return expect(factory.get("SimpleObject").test).toBe(true);
            });
          });
          describe("offTag", function() {
            it("should ignore requests to remove callbacks if no tag", function() {
              var test;
              test = function() {
                return factory.offTag('UndeclaredTag');
              };
              return expect(test).not.toThrow();
            });
            it("should remove the callback passed in", function() {
              var tester;
              tester = function(i) {
                return i.test = true;
              };
              factory.onTag("SimpleObject", tester);
              factory.offTag("SimpleObject", tester);
              return expect(factory.get('SimpleObject').test).not.toBeDefined();
            });
            it("should remove all callbacks if one isn't provided", function() {
              var tester;
              tester = function(i) {
                return i.test = true;
              };
              factory.onTag("SimpleObject", tester);
              factory.offTag("SimpleObject");
              return expect(factory.get('SimpleObject').test).not.toBeDefined();
            });
            it("should throw if no tag is provided", function() {
              var tester;
              tester = function() {
                return factory.offTag();
              };
              return expect(tester).toThrow();
            });
            return it("should throw if in the callback is not found", function() {
              var tester;
              tester = function() {
                factory.onTag("SimpleObject", function(i) {
                  return i.test = true;
                });
                return factory.offTag("SimpleObject", function(i) {
                  return i.test = true;
                });
              };
              return expect(tester).toThrow();
            });
          });
          describe("isType", function() {
            beforeEach(function() {
              return factory.define('aType', function() {
                return this.test = true;
              });
            });
            it("should return true if the type matches", function() {
              var instance;
              instance = factory.get('aType');
              return expect(factory.isType(instance, 'aType')).toBe(true);
            });
            return it("should return false if the type doesn't match", function() {
              var instance;
              instance = factory.get('aType');
              return expect(factory.isType(instance, 'bType')).toBe(false);
            });
          });
          return describe("getType", function() {
            beforeEach(function() {
              return factory.define('aType', function() {
                return this.test = true;
              });
            });
            return it("should return the type as a string", function() {
              var instance;
              instance = factory.get('aType');
              return expect(factory.getType(instance)).toEqual('aType');
            });
          });
        });
      });
    });
  });

}).call(this);
