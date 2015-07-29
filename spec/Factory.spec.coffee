require ['Factory'], (Factory) ->
  'use strict'

  describe 'Factory class', ->

    describe 'composeConfig class method', ->

      describe 'with objects', ->

        it 'should compose n objects', ->
          result = Factory.composeConfig {'defaultConfig'}, {'overrideConfig'}
          expect(result).toEqual {'defaultConfig', 'overrideConfig'}

        it 'should compose n functions', ->
          result = Factory.composeConfig (->{'defaultConfig'}), (->{'overrideConfig'})
          expect(result()).toEqual {'defaultConfig', 'overrideConfig'}

        it 'should compose n mixed objects/functions', ->
          defaultConfig = {'defaultConfig', functionConfig: 'defaultConfig'}
          functionConfig = -> {'functionConfig', defaultConfig: 'functionConfig'}
          overrideConfig = {'overrideConfig', functionConfig: 'overrideConfig'}
          result = Factory.composeConfig defaultConfig, functionConfig, overrideConfig
          expect(result()).toEqual {
            defaultConfig: 'functionConfig'
            functionConfig: 'overrideConfig'
            overrideConfig: 'overrideConfig'
          }

      describe 'with arrays', ->

        it 'should compose n arrays', ->
          result = Factory.composeConfig ['defaultConfig'], ['overrideConfig']
          expect(result).toEqual ['defaultConfig', 'overrideConfig']

        it 'should compose n functions', ->
          result = Factory.composeConfig (->['defaultConfig']), (->['overrideConfig'])
          expect(result()).toEqual ['defaultConfig', 'overrideConfig']

        it 'should compose n mixed arrays/functions', ->
          defaultConfig = ['defaultConfig']
          functionConfig = -> ['functionConfig']
          overrideConfig = ['overrideConfig']
          result = Factory.composeConfig defaultConfig, functionConfig, overrideConfig
          expect(result()).toEqual ['defaultConfig', 'functionConfig', 'overrideConfig']

#     describe 'extendMixinOptions class method', ->
#       # TODO

  describe 'Factory instance', ->
    baseFactoryTags = ['BaseTag1', 'BaseTag2']
    testFactoryTags = ['TestTag1', 'TestTag2']

    baseFactory = null
    testFactory = null

    beforeEach ->
      baseFactory = new Factory Factory, baseTags: baseFactoryTags
      testFactory = new Factory Factory, baseTags: testFactoryTags

    it 'should allow the baseTags property to be set in the constructor', ->
      expect(baseFactory.baseTags).toContain tag for tag in baseFactoryTags
      expect(testFactory.baseTags).toContain tag for tag in testFactoryTags

    describe 'define method', ->
      result = null
      baseTrigger = null
      testTrigger = null
      testDefinition = null

      beforeEach ->
        baseTrigger = sinon.spy baseFactory, 'trigger'
        testTrigger = sinon.spy testFactory, 'trigger'
        testDefinition = -> @test = 'test'
        result = testFactory.define 'test', testDefinition
        testFactory.mirror baseFactory

      it 'should return the factory instance', ->
        expect(result).toBe testFactory

      it 'should trigger a `define` event', ->
        factoryDefinition = testFactory.getDefinition 'test'
        expect(testTrigger).toHaveBeenCalledOnce()
        expect(testTrigger.firstCall.args[0]).toBe 'define'
        expect(testTrigger.firstCall.args[1]).toBe 'test'
        expect(testTrigger.firstCall.args[2]).toEqual factoryDefinition.definition
        expect(testTrigger.firstCall.args[3]).toEqual factoryDefinition.definition.options
        expect(testTrigger.firstCall.args[4]).toBe testFactory

      it 'should create a deferred container for the definition', ->
        basePromiseStub = sinon.stub()
        testPromiseStub = sinon.stub()

        baseFactory.whenDefined('test').promise().then basePromiseStub
        testFactory.whenDefined('test').promise().then testPromiseStub

        # Because testFactory already has the 'test' definition defined, the
        # testPromiseStub should have already been resolved, however the
        # baseFactory doesn't know about testFactory's 'test' definition.
        expect(basePromiseStub).not.toHaveBeenCalled()
        expect(testPromiseStub).toHaveBeenCalledOnce()

        # Now if we define the 'test' definition on the baseFactory...
        baseFactory.define 'test', (->)

        # ... the promise should be resolved ...
        expect(basePromiseStub).toHaveBeenCalledOnce()

        # ... and the testFactory promise stub should not execute again.
        expect(testPromiseStub).toHaveBeenCalledOnce()

      it 'should make definitions available in the defined factory', ->
        expect(testFactory.hasDefinition 'test').toBe true
        expect(baseFactory.hasDefinition 'test').toBe false

        baseFactory.define 'test', (->)
        expect(baseFactory.hasDefinition 'test').toBe true

        baseFactoryTest = baseFactory.getDefinition 'test'
        testFactoryTest = testFactory.getDefinition 'test'
        expect(testFactoryTest).not.toEqual baseFactoryTest

      it 'should accept an object as a definition', ->
        testFactory.define 'Object', {test: true}, singleton: true
        expect(testFactory.getInstance('Object').test).toBe(true)

      it 'should throw if a definition is already defined', ->
        expect(-> baseFactory.define 'test', (->)).not.toThrow()
        expect(-> baseFactory.define 'test', (->)).toThrow()
        expect(-> testFactory.define 'test', (->)).toThrow()

      it 'should not throw if already defined with silent options', ->
        baseFactory.define 'test', (->)
        expect(-> baseFactory.define 'test', (->), silent: true).not.toThrow()
        expect(-> testFactory.define 'test', (->), silent: true).not.toThrow()

      it 'should allow a definition to be replaced with the override flag', ->
        baseDefinition = -> @test = this # instanceof Function
        testDefinition = -> @test = this # instanceof Function
        baseFactory.define 'test', (->)
        expect(-> baseFactory.define 'test', baseDefinition, override: true).not.toThrow()
        expect(-> testFactory.define 'test', testDefinition, override: true).not.toThrow()
        baseInstance = baseFactory.getInstance 'test'
        testInstance = testFactory.getInstance 'test'
        expect(baseInstance).toBeInstanceOf baseDefinition
        expect(testInstance).toBeInstanceOf testDefinition
        expect(baseInstance.test).toBe baseInstance
        expect(testInstance.test).toBe testInstance

      it 'should compose the definition\'s name in its tags', ->
        testFactory.define 'TagTest', (->)
        expect(testFactory.getInstance 'TagTest').toHaveTag 'TagTest'

      it 'should trigger an event when a definition is created', ->
        expect(baseTrigger).not.toHaveBeenCalled()
        expect(testTrigger).toHaveBeenCalledOnce()

        baseFactory.define 'test', (->)
        expect(baseTrigger).toHaveBeenCalledOnce()
        expect(testTrigger).toHaveBeenCalledTwice()

        testDefinition = testFactory.getDefinition('test').definition
        baseDefinition = baseFactory.getDefinition('test').definition

        expect(baseTrigger.firstCall).toHaveBeenCalledWith(
          'define', 'test', baseDefinition, baseDefinition.options, baseFactory
        )
        expect(testTrigger.firstCall).toHaveBeenCalledWith(
          'define', 'test', testDefinition, testDefinition.options, testFactory
        )
        expect(testTrigger.secondCall).toHaveBeenCalledWith(
          'define', 'test', baseDefinition, baseDefinition.options, baseFactory
        )

    describe 'extend method', ->
      trigger = null
      testTags = ['TestTag1', 'TestTag2']
      extendTags = ['ExtendTag1', 'ExtendTag2']

      beforeEach ->
        testFactory.define 'ExtendTest', (->),
          tags: testTags
          mixins: ['TestMixin']
        trigger = sinon.spy testFactory, 'trigger'

      it 'should trigger a `define` event', ->
        expect(trigger).not.toHaveBeenCalled()
        testFactory.extend 'ExtendTest', 'Extended', {}, tags: extendTags
        expect(trigger).toHaveBeenCalledOnce()
        factoryDefinition = testFactory.getDefinition 'Extended'
        expect(trigger.firstCall.args[0]).toBe 'define'
        expect(trigger.firstCall.args[1]).toBe 'Extended'
        expect(trigger.firstCall.args[2]).toEqual factoryDefinition.definition
        expect(trigger.firstCall.args[3]).toEqual factoryDefinition.definition.options
        expect(trigger.firstCall.args[4]).toBe testFactory

      it 'should throw if a requested base class is not defined', ->
        expect(-> testFactory.extend 'InvalidClass', 'ValidObject', {}).toThrow()

      it 'should throw if an invalid definition is presented', ->
        expect(-> testFactory.extend 'ExtendTest', 'InvalidObject', no).toThrow()

      it 'should inherit tags the from the base definition', ->
        testFactory.extend 'ExtendTest', 'Extended', {}, tags: extendTags
        {definition} = testFactory.getDefinition 'Extended'
        expect(definition.options.tags).toContain tag for tag in testTags
        expect(definition.options.tags).toContain tag for tag in extendTags

      it 'should extend instances of the base definition with the new definition', ->
        testFactory.extend 'ExtendTest', 'Extended', {extended: true}
        {definition} = testFactory.getDefinition 'Extended'
        expect(definition.constructor::extended).toBe true

      it 'should inherit the base definitions mixins if the inheritMixins flag is set', ->
        testFactory.extend 'ExtendTest', 'Extended', {}, inheritMixins: true
        {definition} = testFactory.getDefinition 'Extended'
        expect(definition.options.mixins).toContain 'TestMixin'

      describe 'when extending a mirrored definition', ->
        baseTestTags = ['BaseTest1', 'BaseTest2']
        baseExtendTags = ['BaseExtended1', 'BaseExtended2']

        beforeEach ->
          testFactory.mirror baseFactory
          baseFactory.define 'BaseTest', (-> @baseTest = true), tags: baseTestTags
          testFactory.extend 'BaseTest', 'BaseExtended', {baseExtended: true}, tags: baseExtendTags

        it 'should extend instances of the mirrored factorys base definition with the new definition', ->
          instance = testFactory.getInstance 'BaseExtended'
          expect(instance.baseTest).toBe true
          expect(instance.baseExtended).toBe true

        it 'should inherit tags from the base factory', ->
          instance = testFactory.getInstance 'BaseExtended'
          expect(instance).toHaveTag tag for tag in baseTestTags
          expect(instance).toHaveTag tag for tag in baseExtendTags

    describe 'hasDefinition method', ->

      beforeEach ->
        testFactory.mirror baseFactory

      it 'should return false if no definition is available', ->
        expect(baseFactory.hasDefinition 'test').toBe false
        expect(testFactory.hasDefinition 'test').toBe false

      it 'shouild return true if a definition is available in the current factory', ->
        testFactory.define 'test', (->)
        expect(baseFactory.hasDefinition 'test').toBe false
        expect(testFactory.hasDefinition 'test').toBe true

      it 'should return true if a definition is available in a mirrored factory', ->
        baseFactory.define 'test', (->)
        expect(baseFactory.hasDefinition 'test').toBe true
        expect(testFactory.hasDefinition 'test').toBe true

    describe 'whenDefined method', ->
      baseOptions = null
      basePromise = null
      baseDefinition = null
      basePromiseStub = null

      testOptions = null
      testPromise = null
      testDefinition = null
      testPromiseStub = null

      beforeEach ->
        testFactory.mirror baseFactory

        baseOptions = {} # new Object
        baseDefinition = -> @test = 'baseDefinition'
        basePromise = baseFactory.whenDefined('SomeDefinition')
        basePromise.then basePromiseStub = sinon.stub()

        testOptions = {} # new Object
        testDefinition = -> @test = 'testDefinition'
        testPromise = testFactory.whenDefined('SomeDefinition')
        testPromise.then testPromiseStub = sinon.stub()

      it 'should return a promise', ->
        expect(testFactory.whenDefined('SomeObject')).toBePromise()

      it 'should resolve whenDefined promises when a definition is provided', (done) ->
        expect(testPromiseStub).not.toHaveBeenCalled()
        testPromise.then (name, definition, options, factory) ->
          factoryDefinition = testFactory.getDefinition 'SomeDefinition'
          expect(testPromiseStub).toHaveBeenCalledOnce()
          expect(name).toBe 'SomeDefinition'
          expect(options).toBe testOptions
          expect(factory).toBe testFactory
          expect(definition).toEqual factoryDefinition.definition
        testPromise.then done
        testFactory.define 'SomeDefinition', testDefinition, testOptions

      it 'should resolve whenDefined promises when a definition is provided on a mirrored factory', (done) ->
        expect(basePromiseStub).not.toHaveBeenCalled()
        expect(testPromiseStub).not.toHaveBeenCalled()

        test = (name, definition, options, factory) ->
          factoryDefinition = baseFactory.getDefinition 'SomeDefinition'
          expect(name).toBe 'SomeDefinition'
          expect(factory).toBe baseFactory
          expect(options).toEqual baseOptions
          expect(definition).toEqual factoryDefinition.definition

        basePromise.then -> expect(basePromiseStub).toHaveBeenCalledOnce()
        testPromise.then -> expect(testPromiseStub).toHaveBeenCalledOnce()

        basePromise.then test
        testPromise.then test

        testPromise.then done

        baseFactory.define 'SomeDefinition', baseDefinition, baseOptions

    describe 'fetchDefinition method', ->

      beforeEach ->
        testFactory.mirror baseFactory

      it 'should return a promise when called', ->
        expect(testFactory.fetchDefinition('Factory')).toBePromise()

      it 'should resolve the promise when the definition gets retrieved', (done) ->
        testFactory.fetchDefinition('Factory').then (name, definition, options, factory) ->
          factoryDefinition = testFactory.getDefinition 'Factory'
          expect(name).toBe 'Factory'
          expect(factory).toBe testFactory
          expect(options).toEqual {}
          expect(definition).toEqual factoryDefinition.definition
          done()

      it 'should resolve the promise when a definition gets retrieved from a mirrored factory', (done) ->
        basePromise = baseFactory.fetchDefinition 'Factory'
        basePromise.then basePromiseStub = sinon.stub()

        testPromise = testFactory.whenDefined 'Factory'
        testPromise.then testPromiseStub = sinon.stub()

        test = (name, definition, options, factory) ->
          factoryDefinition = baseFactory.getDefinition 'Factory'
          expect(name).toBe 'Factory'
          expect(factory).toBe baseFactory
          expect(options).toEqual {}
          expect(definition).toEqual factoryDefinition.definition

        basePromise.then -> expect(basePromiseStub).toHaveBeenCalledOnce()
        testPromise.then -> expect(testPromiseStub).toHaveBeenCalledOnce()
        basePromise.then test
        testPromise.then test
        testPromise.then done

    describe 'defineMixin method', ->
      mixin = null
      result = null
      trigger = null
      options = null

      beforeEach ->
        mixin = { 'test' }
        trigger = sinon.spy testFactory, 'trigger'
        options = { mixins: ['test1'], tags: ['test1'] }
        result = testFactory.defineMixin 'test', mixin, options

      it 'should return this', ->
        expect(result).toBe testFactory

      it 'should have the defined mixins', ->
        expect(testFactory.mixins.test).toBeDefined()

      it 'should have the defined mixin dependency', ->
        expect(testFactory.mixins.test.options.mixins).toEqual(['test1'])

      it 'should have the defined mixin tags', ->
        expect(testFactory.mixins.test.options.tags).toEqual(['test1'])

      it 'should throw if that mixin is already defined', ->
        expect(-> testFactory.defineMixin 'test', mixin).toThrow()

      it 'should allow overriding a mixin with override flag', ->
        expect(-> testFactory.defineMixin 'test', mixin, { override: true }).not.toThrow()

      it 'should trigger an event', ->
        expect(trigger).toHaveBeenCalledOnce()
        expect(trigger).toHaveBeenCalledWith 'defineMixin', 'test', mixin, options

    describe 'getInstance/get method', ->
      constructedStub = sinon.stub()

      class BaseDefinition
        constructor: (options) -> @initialize options
        initialize: (options = {}) ->
          _.extend this, options
          @constructed or= sinon.stub()
          return this

      beforeEach ->
        testFactory.mirror baseFactory

        baseFactory.defineMixin 'one', one: true
        baseFactory.defineMixin 'two',
          mixconfig: -> # nop
          mixinitialize: -> @two = true

        testFactory.defineMixin 'three', mixinitialize: -> @three = true
        testFactory.defineMixin 'four', { mixinitialize: -> @four = true }, mixins: ['three']

        baseFactory.define 'BaseDefinition', BaseDefinition, {
          mixins: ['one', 'two']
          singleton: true
        }

        testFactory.extend 'BaseDefinition', 'TestDefinition', {
          name: 'TestDefinition'
        }, {
          mixins: ['four']
          singleton: true
          inheritMixins: true
        }

      it 'should make __factory available immediately after construction', ->
        expect(testFactory.getInstance('TestDefinition', {}).__factory()).toBe testFactory
        expect(testFactory.getInstance('BaseDefinition', {}).__factory()).toBe testFactory
        expect(baseFactory.getInstance('BaseDefinition', {}).__factory()).toBe baseFactory

      it 'should make __type available immediately after construction', ->
        testInstance = testFactory.getInstance 'TestDefinition', constructed: ->
          expect(this).toBeType 'TestDefinition'
        expect(testInstance).toBeType 'TestDefinition'

      it 'should return the appropriate object instance', ->
        expect(baseFactory.getInstance 'BaseDefinition', {}).toBeInstanceOf BaseDefinition
        expect(testFactory.getInstance 'BaseDefinition', {}).toBeInstanceOf BaseDefinition
        expect(testFactory.getInstance 'TestDefinition', {}).toBeInstanceOf BaseDefinition

      it 'should have a wrapped constructor', ->
        testInstance = testFactory.getInstance('TestDefinition', {})
        expect(testInstance.constructor).not.toBe BaseDefinition.constructor

      it 'should return a cached instance if the definition is a singleton', ->
        testInstance1 = testFactory.getInstance 'TestDefinition'
        testInstance2 = testFactory.getInstance 'TestDefinition'
        expect(testInstance1).toBe testInstance2

      it 'should mixin any requested mixins', ->
        baseInstance = baseFactory.getInstance 'BaseDefinition'
        testInstance = testFactory.getInstance 'TestDefinition'
        expect(baseInstance.one).toBe true
        expect(baseInstance.two).toBe true
        expect(testInstance.one).toBe true
        expect(testInstance.two).toBe true
        expect(testInstance.three).toBe true
        expect(testInstance.four).toBe true

      it 'should throw if you provide in invalid mixin', ->
        testFactory.define 'BadMixin', (-> @herp = true), mixins: ['Invalid']
        expect(-> testFactory.getInstance 'BadMixin').toThrow()

      it 'should support late mixing via the apply mixin method', ->
        baseInstance = baseFactory.getInstance 'BaseDefinition'
        expect(-> baseFactory.applyMixin baseInstance, 'four').toThrow()
        expect(-> testFactory.applyMixin baseInstance, 'four').not.toThrow()
        expect(baseInstance.one).toBe true
        expect(baseInstance.two).toBe true
        expect(baseInstance.three).toBe true
        expect(baseInstance.four).toBe true

      it 'should support late mixing via the __mixin method', ->
        baseInstance = baseFactory.getInstance 'BaseDefinition'
        testInstance = testFactory.getInstance 'BaseDefinition'
        expect(-> baseInstance.__mixin 'four').toThrow()
        expect(-> testInstance.__mixin 'four').not.toThrow()
        expect(testInstance.one).toBe true
        expect(testInstance.two).toBe true
        expect(testInstance.three).toBe true
        expect(testInstance.four).toBe true

      it 'should throw if an invalid definition is referenced', ->
        expect(-> testFactory.getInstance 'Invalid').toThrow()

      it 'should have invoked the constructed method at invocation time', ->
        testInstance = testFactory.getInstance 'BaseDefinition', 1, 2, 3
        expect(testInstance.constructed).toHaveBeenCalledOnce()
        expect(testInstance.constructed).toHaveBeenCalledWith 1, 2, 3
        expect(testInstance.constructed).toHaveBeenCalledOn testInstance

      it 'should not throw if executing mixconfig with no ctor args', ->
        expect(-> testInstance = testFactory.getInstance 'BaseDefinition').not.toThrow()

    describe 'resolveInstance method', ->

      class TestDefinition
        constructor: -> @test = true

      beforeEach ->
        testFactory.define 'TestDefinition', TestDefinition

      it 'should resolve string to a factory instance', ->
        instance = testFactory.resolveInstance 'TestDefinition'
        expect(instance).toBeInstanceOf TestDefinition

      it 'should resolve (-> "") to a factory instance', ->
        instance = testFactory.resolveInstance -> 'TestDefinition'
        expect(instance).toBeInstanceOf TestDefinition

      it 'should resolve (-> instance) to instance', ->
        instance = testFactory.resolveInstance -> new TestDefinition
        expect(instance).toBeInstanceOf TestDefinition

    describe 'mixinOptions special cases', ->

      beforeEach ->
        testFactory.defineMixin 'one', {
          mixinOptions:
            one:
              test: false
              flat: false
            two:
              test: false
              flat: false
        }, mixins: ['two']

        testFactory.defineMixin 'two',
          mixinOptions:
            two:
              test: true
              flat: true

        testFactory.define 'MixedObject', ((options) ->
          @options = -> options
        ), mixins: ['one']

        testFactory.define 'RemixedObject', ((options) ->
          @options = -> options
        ), mixins: ['two']

      it 'should have the right mixinOptions', ->
        mixed = testFactory.getInstance 'MixedObject'
        expect(mixed.mixinOptions.one.test).toBe(false)
        expect(mixed.mixinOptions.two.test).toBe(false)

      it 'should support single depth mixinOptions', ->
        remixed = testFactory.getInstance 'RemixedObject'
        expect(remixed.mixinOptions.two.test).toBe(true)

    describe 'definition mixin special cases', ->

      beforeEach ->
        @date = new Date()
        @fn = ->

        testFactory.defineMixin 'InheritedMixin', {
          mixinOptions:
            mixconfig:
              inherited: false
          center: true
        }, mixins: null

        testFactory.defineMixin 'MixconfigMixin', {
          mixconfig: ({mixconfig}) ->
            mixconfig.inherited = true
        }, mixins: ['InheritedMixin']

        testFactory.extend 'Base', 'MixinObject', {
          mixinOptions:
            inherited:
              left: true
            test: [1]
            fn: @fn
        }, mixins: ['InheritedMixin']

        testFactory.extend 'MixinObject', 'InheritedMixinObject', {
          mixinOptions:
            inherited:
              right: true
            test: [2]
            date: @date
        }, {
          mixins: null
          inheritMixins: true
        }

        testFactory.extend 'MixinObject', 'MixconfigObject', {
        }, mixins: ['MixconfigMixin']

        testFactory.extend 'MixinObject', 'BadMixinObject', {
          mixinOptions: null
          mixconfig: ->
            derp: 'herp'
        }, mixins: ['DoesntExist']

        @object = testFactory.getInstance('InheritedMixinObject')
        @failTest = -> testFactory.getInstance('BadMixinObject')

      it 'should contain the expected mixinOptions', ->
        expect(@object.mixinOptions.inherited.right).toBe(true)
        expect(@object.mixinOptions.inherited.left).toBe(true)

      it 'should extend array mixinOptions', ->
        expect(@object.mixinOptions.test).toContain(1)
        expect(@object.mixinOptions.test).toContain(2)

      it 'should just keep the newest for other types', ->
        expect(@object.mixinOptions.date).toBe(@date)
        expect(@object.mixinOptions.fn).toBe(@fn)

      it 'should inherit mixins when the inheritMixins flag is true', ->
        expect(@object.center).toBe(true)

      it 'should give back mixins when __mixins method is invoked', ->
        expect(@object.__mixins()).toContain 'InheritedMixin'

      it 'should throw if the mixin isn\'t defined', ->
        expect(@failTest).toThrow()

      it 'should allow modification of mixinOptions from depended mixins', ->
        mixconfigObject = testFactory.getInstance 'MixconfigObject'
        expect(mixconfigObject.mixinOptions.mixconfig.inherited).toBe true

    describe 'getConstructor method', ->
      class BaseDefinition
        constructor: -> # nop

      beforeEach ->
        testFactory.mirror baseFactory
        baseFactory.define 'BaseDefinition', BaseDefinition
        testFactory.extend 'BaseDefinition', 'TestDefinition', {
          test: 'TestDefinition'
        }, singleton: true

      it 'should attach the correct prototype to the function returned', ->
        factoryDefinition = testFactory.getDefinition('BaseDefinition').definition
        factoryConstructor = testFactory.getConstructor 'BaseDefinition'
        expect(factoryDefinition.constructor.prototype).toBe factoryConstructor.prototype

      it 'should create the expected object when instanciated', ->
        factoryConstructor = testFactory.getConstructor 'TestDefinition'
        testInstance = new factoryConstructor
        expect(testInstance).toBeInstanceOf BaseDefinition
        expect(testInstance.test).toBe 'TestDefinition'

      describe 'optional `original` argument', ->

        it 'should return the original constructor', ->
          factoryDefinition = testFactory.getDefinition('TestDefinition').definition
          factoryConstructor = testFactory.getConstructor 'TestDefinition', true
          expect(factoryConstructor).toBe factoryDefinition.constructor

    describe 'mirror', ->

      class BaseDefinition
        constructor: -> # nop

      beforeEach ->
        baseFactory.define 'BaseDefinition', BaseDefinition

      it 'should throw if invoked without a factory', ->
        expect(-> testFactory.mirror()).toThrow()

      it 'should make mirrored factory definitions available', ->
        expect(testFactory.hasDefinition 'BaseDefinition').toBe false
        testFactory.mirror baseFactory
        expect(testFactory.hasDefinition 'BaseDefinition').toBe true
        expect(testFactory.get 'BaseDefinition').toBeInstanceOf BaseDefinition

    describe 'factory map', ->
      testInstance = undefined

      beforeEach ->
        testFactory.defineMixin 'TagMixin', {}, tags: ['MixedInto']
        testFactory.define 'SimpleObject', (-> @isSimple = true), {
          tags: ['NotSoSimple', 'KindaComplicated']
        }
        testFactory.extend 'SimpleObject', 'LessSimpleObject',{
          isThisSiple: -> not @isSimple
        }, {
          mixins: ['TagMixin']
          tags: ['Difficult']
        }
        testInstance = testFactory.getInstance('LessSimpleObject')

      it 'should have the right tags in memory', ->
        expect(testInstance.__tags()).toContain('MixedInto')
        expect(testInstance.__tags()).toContain('Difficult')
        expect(testInstance.__tags()).toContain('NotSoSimple')
        expect(testInstance.__tags()).toContain('KindaComplicated')
        expect(testInstance.__tags()).toContain('SimpleObject')

      it 'should be able to verify an instance map', ->
        expect(testFactory.verifyTags(testInstance)).toBe true

      it 'should be able to dispose of an instance', ->
        testFactory.dispose testInstance
        expect(testFactory.verifyTags(testInstance)).toBe false

      it 'should provide a dispose shortcut on the instance', ->
        testInstance.__dispose()
        expect(testFactory.verifyTags(testInstance)).toBe false

      it 'should throw if dispose is called with an invalid instance', ->
        testFactory.dispose(testInstance)
        expect(-> testFactory.dispose(testInstance)).toThrow()

      describe 'onTag', ->
        instances = undefined
        beforeEach ->
          instances = _.range(0, 5).map(->
            testFactory.getInstance 'LessSimpleObject'
          )

        afterEach ->
          _.invoke instances, '__dispose'

        it 'should support adding tag callbacks for tags not defined yet', ->
          tester = ->
            testFactory.onTag 'NonExistant.Tag', (instance)->
              instance.test = true
          expect(tester).not.toThrow()

        it 'should provide a method for modifying all instances of a tag', ->
          expect(testFactory).toProvideMethod 'onTag'

        it 'should throw if insufficient arguments', ->
          insufficientArgs = ->
            testFactory.onTag()
          expect(insufficientArgs).toThrow()

        it 'should throw if non string tag passed', ->
          invalidArgs = ->
            testFactory.onTag(->
              null
            , null)
          expect(invalidArgs).toThrow()

        it 'should throw if non function callback passed', ->
          invalidArgs = ->
            testFactory.onTag('LessSimpleObject', [1,2,3])
          expect(invalidArgs).toThrow()

        it 'should call the callback on all existing instances', ->
          testFactory.onTag 'SimpleObject', (instance) ->
            instance.test = true

          expect(_.chain(instances).pluck('test').all().value()).toBe true

        it 'should call the callback on any matching tags', ->
          reset = ->
            _.each instances, (i) ->
              i.test = false

          _.each [
            'NotSoSimple'
            'KindaComplicated'
            'LessSimpleObject'
            'Difficult'
            'MixedInto'
          ], (tag) ->
            testFactory.onTag tag, (i) ->
              i.test = true

            expect(_.chain(instances).pluck('test').all().value()).toBe true
            reset()


        it 'should call the callback on any future instances', ->
          _.each [
            'SimpleObject'
            'NotSoSimple'
            'KindaComplicated'
            'LessSimpleObject'
            'Difficult'
            'MixedInto'
          ], (tag) ->
            testFactory.onTag tag, (i) ->
              i.test = true
          expect(testFactory.getInstance('SimpleObject').test).toBe true

      describe 'offTag', ->

        it 'should ignore requests to remove callbacks if no tag', ->
          test = -> testFactory.offTag('UndeclaredTag')
          expect(test).not.toThrow()

        it 'should remove the callback passed in', ->
          tester = (i)-> i.test = true
          testFactory.onTag 'SimpleObject', tester
          testFactory.offTag 'SimpleObject', tester
          expect(testFactory.getInstance('SimpleObject').test).not.toBeDefined()

        it 'should remove all callbacks if one isn\'t provided', ->
          tester = (i)-> i.test = true
          testFactory.onTag 'SimpleObject', tester
          testFactory.offTag 'SimpleObject'
          expect(testFactory.getInstance('SimpleObject').test).not.toBeDefined()

        it 'should throw if no tag is provided', ->
          tester = -> testFactory.offTag()
          expect(tester).toThrow()

        it 'should throw if in the callback is not found', ->
          tester = ->
            testFactory.onTag 'SimpleObject', (i)-> i.test = true
            testFactory.offTag 'SimpleObject', (i)-> i.test = true
          expect(tester).toThrow()
