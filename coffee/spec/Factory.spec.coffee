require ["Factory"], (Factory) ->
  describe "Factory", ->
    it "should exist when referenced", ->
      expect(Factory).toBeDefined()

    it "should allow the creation of a new Factory", ->
      factory = new Factory(->
        @x = true
      )
      expect(factory).toBeDefined()

    describe "factory instance", ->
      factory = null
      beforeEach ->
        factory = new Factory(->
          @x = true
          @y = false
        )


      describe "define method", ->
        beforeEach ->
          factory.define "test", ->
            @test = true

        it "should provide define method", ->
          expect(factory).toProvideMethod "define"

        it "should add a definition when define is called", ->
          expect(factory.definitions.test).toBeDefined()

        it "should accept an object as the definition", ->
          factory.define 'Object', test: true, singleton: true
          expect(factory.get('Object').test).toBe(true)

        it "should throw if a definition is already defined", ->
          test = ->
            factory.define "test", ->
              @test = false
          expect(test).toThrow()

        it "should allow override of a definition with override flag", ->
          test = ->
            factory.define "test", ->
              @test = this
            , override: true
          expect(test).not.toThrow()
          t = factory.get('test')
          expect(t.test).toEqual(t)


      it "should provide hasDefinition method", ->
        expect(factory).toProvideMethod "hasDefinition"

      describe "hasDefinition method", ->
        beforeEach ->
          factory.define "test", ->
            @test = true

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
        beforeEach ->
          factory.defineMixin "test",
            test: true

        it "should provide defineMixin method", ->
          expect(factory).toProvideMethod "defineMixin"


        it "should have the defined mixins", ->
          expect(factory.mixins.test).toBeDefined()

        it "should throw if that mixin is already defined", ->
          test = ->
            factory.defineMixin 'test',
              test: false
          expect(test).toThrow()

        it "should allow overriding a mixin with appropriate flag", ->
          test = ->
            factory.defineMixin 'test',
              test: false
            , override: true
          expect(test).not.toThrow()


      it "should provide get method", ->
        expect(factory).toProvideMethod "get"

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

          factory.define "Test", Test,
            singleton: true
            mixins: ["one", "two"]


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
