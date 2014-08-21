require ["Factory"], (Factory) ->

  describe "Factory", ->

    it "should exist when referenced", ->
      expect(Factory).toBeDefined()

    it "should allow the creation of a new Factory", ->
      factory = new Factory(-> @x = true )
      expect(factory).toBeDefined()

    it 'should allow the baseTags property to be set in the constructor', ->
      baseTags = ['BaseTag1', 'BaseTag2']
      factory = new Factory (->), {baseTags}
      expect(factory.baseTags).toBe baseTags

    describe "factory instance", ->
      factory = null

      beforeEach ->
        factory = new Factory (->
          @x = true
          @y = false
        ), baseTags: ['BaseTag1', 'BaseTag2']

      describe "define method", ->
        trigger = null

        beforeEach ->
          trigger = sinon.stub factory, 'trigger'
          factory.define "test", ->
            @test = true

        afterEach ->
          trigger.restore()

        it "should provide define method", ->
          expect(factory).toProvideMethod "define"

        it "should add a definition when define is called", ->
          expect(factory.definitions.test).toBeDefined()

        it "should accept an object as the definition", ->
          factory.define 'Object', test: true, singleton: true
          expect(factory.get('Object').test).toBe(true)

        it "should throw if a definition is already defined", ->
          test = -> factory.define "test", -> @test = false
          expect(test).toThrow()

        it "should not throw if already defined with silent options", ->
          test = -> factory.define "test", (-> @test = false), {silent: true}
          expect(test).not.toThrow()

        it 'should concat @baseTags into options.tags', ->
          factory.define 'test', {}, override: true
          expect(factory.definitions.test.tags).toContain 'BaseTag1'
          expect(factory.definitions.test.tags).toContain 'BaseTag2'

        it "should trigger an event", ->
          expect(trigger).toHaveBeenCalledOnce()
          test = factory.definitions.test
          expect(trigger).toHaveBeenCalledWith 'define', 'test', test

        it "should allow override of a definition with override flag", ->
          test = ->
            factory.define "test", ->
              @test = this
            , override: true
          expect(test).not.toThrow()
          t = factory.get('test')
          expect(t.test).toEqual(t)

      describe "hasDefinition method", ->

        beforeEach ->
          factory.define "test", ->
            @test = true

        it "should provide hasDefinition method", ->
          expect(factory).toProvideMethod "hasDefinition"

        it "should provide hasDefinition method", ->
          expect(factory).toProvideMethod "hasDefinition"

        it "should indicate that a definition has been created", ->
          expect(factory.hasDefinition("test")).toBe true
          expect(factory.hasDefinition("nottest")).toBe false

      describe "whenDefined method", ->

        it "should provide a whenDefined method", ->
          expect(factory).toProvideMethod('whenDefined')

        it "should return a promise", ->
          expect(factory.whenDefined('SomeObject')).toBePromise()

        it "should resolve the promise when the definition is provided", (done) ->
          n = false
          promise = factory.whenDefined('SomeObject')
          promise.done (f, name)->
            n = {name, factory: f}
            expect(n.factory).toEqual(factory)
            expect(n.name).toEqual('SomeObject')
            done()
          factory.define 'SomeObject', test: true

      describe "fetchDefinition method", ->

        it "should provide fetchDefinition method", ->
          expect(factory).toProvideMethod('fetchDefinition')

        it "should return a promise when called", ->
          expect(factory.fetchDefinition('Factory')).toBePromise()

        it "should resolve the promise when the definition gets retrieved", (done) ->
          factory.fetchDefinition('Factory').done (f) ->
            expect(factory.hasDefinition('Factory')).toBe(true)
            expect(f).toEqual(factory)
            done()

      describe "defineMixin method", ->
        trigger = mixin = null

        beforeEach ->
          mixin = { 'test' }
          trigger = sinon.stub factory, 'trigger'
          factory.defineMixin "test", mixin, {
            mixins: ['test1'],
            tags: ['test1']
          }

        it "should provide defineMixin method", ->
          expect(factory).toProvideMethod "defineMixin"

        it "should have the defined mixins", ->
          expect(factory.mixins.test).toBeDefined()

        it "should have the defined mixin dependency", ->
          expect(factory.mixinSettings.test.mixins).toEqual(['test1'])

        it "should have the defined mixin tags", ->
          expect(factory.mixinSettings.test.tags).toEqual(['test1'])

        it "should throw if that mixin is already defined", ->
          test = -> factory.defineMixin 'test', mixin
          expect(test).toThrow()

        it "should allow overriding a mixin with appropriate flag", ->
          test = -> factory.defineMixin 'test', mixin, { override: true }
          expect(test).not.toThrow()

        it 'should trigger an event', ->
          expect(trigger).toHaveBeenCalledOnce()
          expect(trigger).toHaveBeenCalledWith 'defineMixin', 'test', mixin

      describe "get method", ->

        Test = (options) ->
          @initialize options
          return this

        Test:: = {
          initialize: (options = {}) ->
            @constructed = options.constructed or sinon.stub()
            this[option] = options[option] for option of options
            return this
        }

        beforeEach ->
          factory.defineMixin "one",
            one: true

          factory.defineMixin "two",
            mixinitialize: ->
              @two = true

          factory.defineMixin "three",
            mixinitialize: ->
              @three = true

          factory.defineMixin "four",
            mixinitialize: ->
              @four = true
          , mixins: ['three']

          factory.define "Test", Test,
            singleton: true
            mixins: ["one", "two"]

        it "should provide get method", ->
          expect(factory).toProvideMethod "get"

        it "should provide a factory retrieval method on an instance", ->
          test = factory.get("Test", {})
          expect(test.__factory()).toEqual(factory)

        it "should make __type available immediately after construction", ->
          factory.get "Test", constructed: -> expect(@__type()).toBe 'Test'

        it "should return the appropriate object instance", ->
          expect(factory.get("Test", {})).toBeInstanceOf Test

        it 'should have a wrapped constructor', ->
          test = factory.get("Test", {})
          expect(test.constructor).not.toBe Test

        it "should return a singleton if that is the option passed", ->
          expect(factory.get("Test")).toEqual factory.get("Test")

        it "should mixin any requested mixins", ->
          test = factory.get("Test")
          expect(test.one).toBe true
          expect(test.two).toBe true

        it "should throw if you provide in invalid mixin", ->
          factory.define 'BadMixin', (->
            @herp = true
          ), mixins: ["Doesn't Exist"]
          tester = -> factory.get 'BadMixin'
          expect(tester).toThrow()

        it "should support late mixing via the apply mixin method", ->
          t = factory.get("Test", {})
          factory.applyMixin t, 'three'
          expect(t.three).toBe true

        it "should support mixin dependencies", ->
          t = factory.get("Test", {})
          t.__mixin('four')
          expect(t.three).toBe true
          expect(t.four).toBe true

        it "should throw if an invalid definition is referenced", ->
          tester = ->
            factory.get('Invalid.Object')
          expect(tester).toThrow()

        it "should have invoked the constructed method at invocation time", ->
          test = factory.get("Test", 1, 2, 3)
          expect(test.constructed).toHaveBeenCalled()

        it "should invoke constructed method with args from constructor", ->
          test = factory.get("Test", 1, 2, 3)
          expect(test.constructed).toHaveBeenCalledWith(1,2,3)

        it "should invoke constructed method with the instance context", ->
          test = factory.get("Test", 1, 2, 3)
          expect(test.constructed).toHaveBeenCalledOn(test)

      describe "mixinOptions special cases", ->

        beforeEach ->
          factory.defineMixin 'one', {
            mixinOptions:
              one:
                test: false
                flat: false
              two:
                test: false
                flat: false
          }, mixins: ['two']

          factory.defineMixin 'two',
            mixinOptions:
              two:
                test: true
                flat: true

          factory.define 'MixedObject', ((options) ->
            @options = -> options
          ), mixins: ['one']

          factory.define 'RemixedObject', ((options) ->
            @options = -> options
          ), mixins: ['two']

        it "should have the right mixinOptions", ->
          mixed = factory.get 'MixedObject'
          expect(mixed.mixinOptions.one.test).toBe(false)
          expect(mixed.mixinOptions.two.test).toBe(false)

        it "should support single depth mixinOptions", ->
          remixed = factory.get 'RemixedObject'
          expect(remixed.mixinOptions.two.test).toBe(true)

      describe "Definition mixin special cases", ->

        beforeEach ->
          @date = new Date()
          @fn = ->

          factory.defineMixin 'InheritedMixin', {
            mixinOptions:
              mixconfig:
                inherited: false
            center: true
          }, mixins: null

          factory.defineMixin 'MixconfigMixin', {
            mixconfig: ({mixconfig}) ->
              mixconfig.inherited = true
          }, mixins: ['InheritedMixin']

          factory.extend 'Base', 'MixinObject', {
            mixinOptions:
              inherited:
                left: true
              test: [1]
              fn: @fn
          }, mixins: ['InheritedMixin']

          factory.extend 'MixinObject', 'InheritedMixinObject', {
            mixinOptions:
              inherited:
                right: true
              test: [2]
              date: @date
          }, {
            mixins: null
            inheritMixins: true
          }

          factory.extend 'MixinObject', 'MixconfigObject', {
          }, mixins: ['MixconfigMixin']

          factory.extend 'MixinObject', 'BadMixinObject', {
            mixinOptions: null
            mixconfig: ->
              derp: 'herp'
          }, mixins: ['DoesntExist']

          @object = factory.get('InheritedMixinObject')
          @failTest = -> factory.get('BadMixinObject')

        it "should contain the expected mixinOptions", ->
          expect(@object.mixinOptions.inherited.right).toBe(true)
          expect(@object.mixinOptions.inherited.left).toBe(true)

        it "should extend array mixinOptions", ->
          expect(@object.mixinOptions.test).toContain(1)
          expect(@object.mixinOptions.test).toContain(2)

        it "should just keep the newest for other types", ->
          expect(@object.mixinOptions.date).toBe(@date)
          expect(@object.mixinOptions.fn).toBe(@fn)

        it "should inherit mixins when the inheritMixins flag is true", ->
          expect(@object.center).toBe(true)

        it "should give back mixins when __mixins method is invoked", ->
          expect(@object.__mixins()).toContain 'InheritedMixin'

        it "should throw if the mixin isn't defined", ->
          expect(@failTest).toThrow()

        it 'should allow modification of mixinOptions from depended mixins', ->
          mixconfigObject = factory.get 'MixconfigObject'
          expect(mixconfigObject.mixinOptions.mixconfig.inherited).toBe true

      describe "getConstructor method", ->

        beforeEach ->
          factory.define "ConstructorTest", (options) ->
            @x = true
            @y = options.y

        it "should return a function", ->
          expect(factory.getConstructor("ConstructorTest")).toBeFunction()

        it "should attach the correct prototype to the function returned", ->
          cptype = factory.getConstructor('ConstructorTest').prototype
          ptype = factory.definitions.ConstructorTest.constructor.prototype
          expect(cptype).toBe(ptype)

        it "should create the expected object when invoked", ->
          ctor = factory.getConstructor("ConstructorTest")
          obj = new ctor(y: false)
          expect(obj.x).toBe true
          expect(obj.y).toBe false

        it "should create the expected type of object", ->
          ctor = factory.getConstructor("ConstructorTest", true)
          fctor = factory.getConstructor("ConstructorTest")
          obj = new fctor(y: false)
          expect(obj).toBeInstanceOf(ctor)

        it "should support singletons", ->
          factory.define "SingletonTest", (->
            @x = true
            @y = false
          ), singleton: true

          ctor = factory.getConstructor("SingletonTest")
          expect(new ctor()).toEqual new ctor()

        describe "optional original argument", ->

          it "should return the original constructor", ->
            ctor = factory.getConstructor "ConstructorTest", true
            obj = factory.get "ConstructorTest", y: true
            expect(obj).toBeInstanceOf(ctor)

        it "should support mixins", ->
          factory.defineMixin "Mixin.One",
            mixinitialize: ->
              @mixedin = true

          factory.define "MixinTest", ->
            @mixedin = false
          , mixins: ["Mixin.One"]

          ctor = factory.getConstructor("MixinTest")
          expect((new ctor()).mixedin).toBe true

      describe "Extend", ->

        it "should add extend capability to any constructor", ->
          factory.define "ExtendTest", ExtendTest = (options) ->
            @test = true

          factory.extend "ExtendTest", "ExtendedObject",
            testHandler: ->
              @test

          expect(factory.get("ExtendedObject").test).toBe true
          expect(factory.get("ExtendedObject").testHandler()).toBe true

        it "should throw if an invalid base class is presented", ->
          tester = ->
            factory.extend 'InvalidClass', 'OtherClass', {}
          expect(tester).toThrow()

        it "should throw if an invalid definition is presented", ->
          tester = ->
            factory.extend 'Base', 'NewThing', false
          expect(tester).toThrow()

      describe "Clone", ->

        beforeEach ->
          @clonedFactory = new Factory ()->
            @cloned = true

          @clonedFactory.define 'Test.Util', (->),
            singleton: true
            override: true
          @clonedFactory.get 'Test.Util'

          factory.define 'Test.Util', (->),
            singleton: true
            override: true
          factory.get 'Test.Util'

        it "shoud throw when an invalid factory is passed", ->
          test = ->
            factory.clone({})
          expect(test).toThrow()

        it "should support cloning of the factory", ->
          factory.define 'Test', test: true
          @clonedFactory.clone(factory)
          expect(@clonedFactory).not.toEqual(factory)

        it "should retain it's own core implementations", ->
          @clonedFactory.clone(factory)
          test1 = factory.get('Base')
          test2 = @clonedFactory.get('Base')
          expect(test1.cloned).not.toBeDefined()
          expect(test2.cloned).toBe true

        it "should support getting definitions from the cloned factory", ->
          factory.define 'Test', {test: true}
          @clonedFactory.clone(factory)
          expect(@clonedFactory.hasDefinition('Test')).toBe true
          test = @clonedFactory.get('Test', {})
          expect(test).toBeDefined()

        it "should have it's own definition hash as well", ->
          factory.define 'Test', {test: true}
          @clonedFactory.clone(factory)
          @clonedFactory.define 'NewTest', {test: true}
          expect(@clonedFactory.hasDefinition('NewTest')).toBe true
          expect(factory.hasDefinition('NewTest')).toBe false

        it "should share an instance pool with it's clone", ->
          factory.define 'Test', {test: true}
          @clonedFactory.clone(factory)
          test1 = factory.get('Test')
          expect(@clonedFactory.instances['Test']).toBeDefined()

        it "should reattach any instance factory accessors to itself", ->
          @clonedFactory.clone(factory)
          test1 = factory.get('Base')
          test2 = @clonedFactory.get('Base')
          expect(test1.__factory()).toEqual(factory)
          expect(test2.__factory()).toEqual(@clonedFactory)

        it "should share any onTag events", ->
          method = ->
          factory.onTag 'Test', method
          @clonedFactory.clone(factory)
          expect(@clonedFactory.tagCbs['Test']).toContain method

        it "should share any define promises", ->
          method = ->
          promise = factory.whenDefined 'DeferredTest'
          @clonedFactory.clone(factory)
          @clonedFactory.promises['DeferredTest']
          expect(@clonedFactory.promises['DeferredTest'].state()).toBe 'pending'

        it "should maintain the singleton status of cloned instances", ->
          @clonedFactory.clone(factory)
          expect(@clonedFactory.instances['Test.Util'].length).toBe 1

      describe 'mirror method', ->
        base = clone = m = null
        methods = [
          "define"
          "hasDefinition"
          "whenDefined"
          "fetchDefinition"
          "extend"
          "mirror"
          "defineMixin"
          "composeMixinDependencies"
          "applyMixin"
          "mixinitialize"
          "handleMixins"
          "handleInjections"
          "handleCreate"
          "handleTags"
          "get"
          "verifyTags"
          "dispose"
          "getConstructor"
          "onTag"
          "offTag"
          "isType"
          "getType"
        ]
        beforeEach ->
          base = new Factory -> {}
          clone = sinon.stub factory, 'clone'
          factory.mirror base
          m = {}

        afterEach ->
          clone.restore()

        it 'should invoke clone', ->
          expect(clone).toHaveBeenCalledOnce()
          expect(clone).toHaveBeenCalledWith base

        _.each methods, (method) ->
          describe "#{method} shadow", ->
            beforeEach ->
              m[method] = sinon.stub factory, method
              base[method] 'test'

            afterEach ->
              m[method].restore()

            it "should bind #{method} to factory", ->
              expect(m[method]).toHaveBeenCalledOnce()
              expect(m[method]).toHaveBeenCalledWith('test')

      describe "Factory Instance Mapping", ->
        lso = undefined

        beforeEach ->
          factory.defineMixin 'TagMixin', {}, {
            tags: ['MixedInto']
          }

          factory.define "SimpleObject", (->
            @isSimple = true
          ),
            tags: ["NotSoSimple", "KindaComplicated"]

          factory.extend "SimpleObject", "LessSimpleObject",
            isThisSiple: ->
              not @isSimple
          ,
            mixins: ['TagMixin']
            tags: ["Difficult"]

          lso = factory.get("LessSimpleObject")

        it "should have the right tags in memory", ->
          expect(lso.__tags()).toContain('MixedInto')
          expect(lso.__tags()).toContain('Difficult')
          expect(lso.__tags()).toContain('NotSoSimple')
          expect(lso.__tags()).toContain('KindaComplicated')
          expect(lso.__tags()).toContain('SimpleObject')

        it "should be able to verify an instance map", ->
          expect(factory.verifyTags(lso)).toBe true

        it "should be able to dispose of an instance", ->
          factory.dispose lso
          expect(factory.verifyTags(lso)).toBe false

        it "should provide a dispose shortcut on the instance", ->
          lso.__dispose()
          expect(factory.verifyTags(lso)).toBe false

        it "should throw if dispose is called with an invalid instance", ->
          factory.dispose(lso)
          tester = ->
            factory.dispose(lso)
          expect(tester).toThrow()

        describe "onTag", ->
          instances = undefined
          beforeEach ->
            instances = _.range(0, 5).map(->
              factory.get "LessSimpleObject"
            )

          afterEach ->
            _.invoke instances, "__dispose"

          it "should support adding tag callbacks for tags not defined yet", ->
            tester = ->
              factory.onTag 'NonExistant.Tag', (instance)->
                instance.test = true
            expect(tester).not.toThrow()

          it "should provide a method for modifying all instances of a tag", ->
            expect(factory).toProvideMethod "onTag"

          it "should throw if insufficient arguments", ->
            insufficientArgs = ->
              factory.onTag()
            expect(insufficientArgs).toThrow()

          it "should throw if non string tag passed", ->
            invalidArgs = ->
              factory.onTag(->
                null
              , null)
            expect(invalidArgs).toThrow()

          it "should throw if non function callback passed", ->
            invalidArgs = ->
              factory.onTag('LessSimpleObject', [1,2,3])
            expect(invalidArgs).toThrow()

          it "should call the callback on all existing instances", ->
            factory.onTag "SimpleObject", (instance) ->
              instance.test = true

            expect(_.chain(instances).pluck("test").all().value()).toBe true

          it "should call the callback on any matching tags", ->
            reset = ->
              _.each instances, (i) ->
                i.test = false

            _.each [
              "NotSoSimple"
              "KindaComplicated"
              "LessSimpleObject"
              "Difficult"
              "MixedInto"
            ], (tag) ->
              factory.onTag tag, (i) ->
                i.test = true

              expect(_.chain(instances).pluck("test").all().value()).toBe true
              reset()


          it "should call the callback on any future instances", ->
            _.each [
              "SimpleObject"
              "NotSoSimple"
              "KindaComplicated"
              "LessSimpleObject"
              "Difficult"
              "MixedInto"
            ], (tag) ->
              factory.onTag tag, (i) ->
                i.test = true
            expect(factory.get("SimpleObject").test).toBe true

        describe "offTag", ->

          it "should ignore requests to remove callbacks if no tag", ->
            test = ->
              factory.offTag('UndeclaredTag')
            expect(test).not.toThrow()

          it "should remove the callback passed in", ->
            tester = (i)->
              i.test = true
            factory.onTag "SimpleObject", tester
            factory.offTag "SimpleObject", tester
            expect(factory.get('SimpleObject').test).not.toBeDefined()

          it "should remove all callbacks if one isn't provided", ->
            tester = (i)->
              i.test = true
            factory.onTag "SimpleObject", tester
            factory.offTag "SimpleObject"
            expect(factory.get('SimpleObject').test).not.toBeDefined()

          it "should throw if no tag is provided", ->
            tester = ->
              factory.offTag()
            expect(tester).toThrow()

          it "should throw if in the callback is not found", ->
            tester = ->
              factory.onTag "SimpleObject", (i)->
                i.test = true
              factory.offTag "SimpleObject", (i)->
                i.test = true
            expect(tester).toThrow()

        describe "isType", ->

          beforeEach ->
            factory.define 'aType', ()-> @test = true

          it "should return true if the type matches", ->
            instance = factory.get 'aType'
            expect(factory.isType(instance, 'aType')).toBe true

          it "should return false if the type doesn't match", ->
            instance = factory.get 'aType'
            expect(factory.isType(instance, 'bType')).toBe false

        describe "getType", ->

          beforeEach ->
            factory.define 'aType', ()-> @test = true

          it "should return the type as a string", ->
            instance = factory.get 'aType'
            expect(factory.getType(instance)).toEqual('aType')
