require ["Factory"], (Factory) ->
  describe "Factory", ->
    it "should exist when referenced", ->
      expect(Factory).toBeDefined()

    it "should allow the creation of a new Factory", ->
      factory = new Factory(->
        @x = true
      )
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

        it 'should concat @baseTags into options.tags', ->
          factory.define 'test', {}, override: true
          expect(factory.definitions.test.tags).toContain 'BaseTag1'
          expect(factory.definitions.test.tags).toContain 'BaseTag2'

        it "should trigger an event", ->
          expect(trigger).toHaveBeenCalledOnce()
          expect(trigger).toHaveBeenCalledWith 'define', 'test', factory.definitions.test

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

        it "should resolve the promise when the definition is provided", ->
          n = false
          promise = factory.whenDefined('SomeObject')
          promise.done (f, name)->
            n =
              factory: f
              name: name

          factory.define 'SomeObject',
            test: true

          waitsFor ->
            n
          runs ->
            expect(n.factory).toEqual(factory)
            expect(n.name).toEqual('SomeObject')

      describe "fetchDefinition method", ->
        it "should provide fetchDefinition method", ->
          expect(factory).toProvideMethod('fetchDefinition')
        it "should return a promise when called", ->
          expect(factory.fetchDefinition('Factory')).toBePromise()
        it "should resolve the promise when the definition gets retrieved", ->
          n = false
          waitsFor ->
            n
          runs ->
            expect(factory.hasDefinition('Factory')).toBe(true)
            expect(n).toEqual(factory)
          factory.fetchDefinition('Factory').done (f)->
            n = f

      describe "defineMixin method", ->
        trigger = mixin = null
        beforeEach ->
          mixin = { 'test' }
          trigger = sinon.stub factory, 'trigger'
          factory.defineMixin "test", mixin

        it "should provide defineMixin method", ->
          expect(factory).toProvideMethod "defineMixin"

        it "should have the defined mixins", ->
          expect(factory.mixins.test).toBeDefined()

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
          this
        Test:: =
          initialize: (options) ->
            for option of options
              this[option] = options[option]
            this

          constructed: ->
            @hasConstructed = true  if @one and @two

        beforeEach ->
          factory.defineMixin "one",
            one: true

          factory.defineMixin "two",
            mixinitialize: ->
              @two = true

          factory.defineMixin "three",
            mixinitialize: ->
              @three = true

          factory.define "Test", Test,
            singleton: true
            mixins: ["one", "two"]

        it "should provide get method", ->
          expect(factory).toProvideMethod "get"

        it "should provide a factory retrieval method on an instance", ->
          test = factory.get("Test", {})
          expect(test.__factory()).toEqual(factory)

        it "should return the appropriate object instance", ->
          expect(factory.get("Test", {})).toBeInstanceOf Test

        it "should return a singleton if that is the option passed", ->
          expect(factory.get("Test")).toEqual factory.get("Test")

        it "should mixin any requested mixins", ->
          test = factory.get("Test")
          expect(test.one).toBe true
          expect(test.two).toBe true

        it "should throw if you provide in invalid mixin", ->
          factory.define 'BadMixin', ->
            @herp = true
          ,
            mixins: ["Doesn't Exist"]

          tester = ()->
            factory.get 'BadMixin'

          expect(tester).toThrow()

        it "should support late mixing via the apply mixin method", ->
          t = factory.get("Test", {})
          factory.applyMixin t, 'three'
          expect(t.three).toBe true

        it "should throw if an invalid definition is referenced", ->
          tester = ->
            factory.get('Invalid.Object')
          expect(tester).toThrow()

        it "should have invoked the constructed method at invocation time", ->
          test = factory.get("Test")
          expect(test.hasConstructed).toBe true

      describe "getConstructor method", ->
        beforeEach ->
          factory.define "ConstructorTest", (options) ->
            @x = true
            @y = options.y


        it "should return a function", ->
          expect(typeof factory.getConstructor("ConstructorTest") is "function").toBe true

        it "should attach the correct prototype to the function returned", ->
          expect(factory.getConstructor('ConstructorTest').prototype).toBe(factory.definitions.ConstructorTest.constructor.prototype)

        describe "optional original argument", ->
          it "should return the original constructor", ->
            ctor = factory.getConstructor "ConstructorTest", true
            obj = factory.get "ConstructorTest", y: true
            expect(obj).toBeInstanceOf(ctor)


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
          ),
            singleton: true

          ctor = factory.getConstructor("SingletonTest")
          expect(new ctor()).toEqual new ctor()

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
        it "should not share an instance pool with it's clone", ->
          factory.define 'Test', {test: true}
          @clonedFactory.clone(factory)
          test1 = factory.get('Test')
          expect(@clonedFactory.instances['Test']).not.toBeDefined()
        it "should reattach any instance factory accessors to itself", ->
          @clonedFactory.clone(factory)
          test1 = factory.get('Base')
          test2 = @clonedFactory.get('Base')
          expect(test1.__factory()).toEqual(factory)
          expect(test2.__factory()).toEqual(@clonedFactory)

      describe 'mirror method', ->
        base = clone = baseOn = null
        beforeEach ->
          base = new Factory -> {}
          baseOn = sinon.stub base, 'on'
          clone = sinon.stub factory, 'clone'
          factory.mirror base
        afterEach ->
          baseOn.restore()
          clone.restore()

        it 'should invoke clone', ->
          expect(clone).toHaveBeenCalledOnce()
          expect(clone).toHaveBeenCalledWith base

        it 'should bind a method to define', ->
          expect(baseOn).toHaveBeenCalledTwice()
          expect(baseOn.firstCall.args[0]).toBe 'define'
          expect(typeof baseOn.firstCall.args[1]).toBe 'function'

        describe 'define handler', ->
          mockDefinition = mixin = options = define = defineMixin = define_handler = null
          beforeEach ->
            options = {}
            mockDefinition = {constructor: Object, options}
            define = sinon.stub factory, 'define'
            define_handler = baseOn.firstCall.args[1]
            define_handler 'test', mockDefinition, options

          afterEach ->
            define.restore()

          it 'should invoke define with the new definition', ->
            expect(define).toHaveBeenCalledOnce()
            expect(define).toHaveBeenCalledWith 'test', Object
            expect(define.firstCall.args[2].silent).toBe true

        it 'should bind a method to defineMixin', ->
          expect(baseOn.secondCall).toHaveBeenCalledWith 'defineMixin', factory.defineMixin, factory

      describe "Factory Instance Mapping", ->
        lso = undefined
        beforeEach ->
          factory.define "SimpleObject", (->
            @isSimple = true
          ),
            tags: ["NotSoSimple", "KindaComplicated"]

          factory.extend "SimpleObject", "LessSimpleObject",
            isThisSiple: ->
              not @isSimple
          ,
            tags: ["Difficult"]

          lso = factory.get("LessSimpleObject")

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

            _.each ["NotSoSimple", "KindaComplicated", "LessSimpleObject", "Difficult"], (tag) ->
              factory.onTag tag, (i) ->
                i.test = true

              expect(_.chain(instances).pluck("test").all().value()).toBe true
              reset()


          it "should call the callback on any future instances", ->
            _.each ["SimpleObject", "NotSoSimple", "KindaComplicated", "LessSimpleObject", "Difficult"], (tag) ->
              factory.onTag tag, (i) ->
                i.test = true
            expect(factory.get("SimpleObject").test).toBe true

        describe "offTag", ->
          it "should ignore requests to remove callbacks for non existant tags", ->
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
