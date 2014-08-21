require ["BackboneFactory", "backbone"], (BackboneFactory, Backbone) ->
  describe "BackboneFactory", ->

    it "should be available", ->
      expect(BackboneFactory).toBeDefined()

    it "should return a default object when no valid definition is found", ->
      expect(BackboneFactory.get("Base")).toBeDefined()
      expect(BackboneFactory.get("Base").on).toBeDefined()

    it "should initialize objects that support that interface", ->
      TestObject = initialize: -> @tested = true
      BackboneFactory.extend "Base", "TestObject", TestObject
      ctor = BackboneFactory.definitions.Base.constructor
      expect(BackboneFactory.get("TestObject")).toBeInstanceOf ctor

    it "should return a view as defined", ->
      view = BackboneFactory.get("View")
      expect(view).toBeInstanceOf(Backbone.View)

    describe "extend method", ->
      BackboneFactory.extend "View", "Test.View",
        el: "body"
        render: ->
          now = (new Date()).getTime()
          html = "<div class='test-item item-#{@cid}'>#{now}</div>"
          @$el.append html

        model: "Test.Model"
      ,
        singleton: true
        mixins: ["one.View", "two.View"]

      BackboneFactory.extend "Model", "Test.Model",
        defaults:
          hello: "world"

        test: ->
          true
      ,
        singleton: true

      BackboneFactory.defineMixin "one.View",
        mixinOptions:
          one: true

        mixinitialize: ->
          @one = ->
            @mixinOptions.one

      BackboneFactory.defineMixin "two.View",
        mixinOptions:
          two: true

        mixinitialize: ->
          @two = @mixinOptions.two

      it "should have extend method", ->
        expect(BackboneFactory).toProvideMethod "extend"

      it "should return any model extended from the base", ->
        model = BackboneFactory.get("Test.Model")
        expect(model.get("hello")).toEqual "world"

      it "should have methods defined on the implementation", ->
        model = BackboneFactory.get("Test.Model")
        expect(model.test()).toBe true

      it "should support extended views with features", ->
        master = BackboneFactory.get("Test.View")
        master.render()
        expect($(".test-item").length).toBe 1
        expect(master.$el.get(0)).toEqual $("body").get(0)

      it "should include functionality and properties added by mixins", ->
        master = BackboneFactory.get("Test.View")
        expect(master.one()).toBe true
        expect(master.two).toBe true


    describe "Model Support", ->
      describe "Clone override", ->
        beforeEach ->
          @model = BackboneFactory.get 'Model',
            test: true

        afterEach ->
          BackboneFactory.dispose @model
          @model = null

        it "should allow cloning of models through the factory", ->
          model = @model.clone()
          expect(model.get('test')).toBe true
          expect(BackboneFactory.verifyTags(model)).toBe true
          disposeTest = -> BackboneFactory.dispose model
          expect(disposeTest).not.toThrow()

    describe "Collection Support", ->
      it "should support getting a standard collection", ->
        collection = BackboneFactory.get("Collection", [1, 2, 3])
        expect(collection).toBeDefined()
        expect(collection).toBeInstanceOf(Backbone.Collection)

      it "should support getting a collection referring to a factory model", ->
        BackboneFactory.extend "Model", "FactoryModel",
          test: ->
            true
        BackboneFactory.extend "Collection", "FactoryCollection",
          model: "FactoryModel"

        collection = BackboneFactory.get("FactoryCollection", [
          {id: 1}
          {id: 2}
          {id: 3}
        ])
        expect(collection).toBeDefined()
        collection.each (model)->
          expect(model.test()).toBe true
        collection.set([{id: 1},{id: 2}])
        expect(collection.size()).toBe 2

      describe "Clone override", ->
        beforeEach ->
          @collection = BackboneFactory.get 'Collection', [
            {id: 1}
            {id: 2}
            {id: 3}
          ]

        afterEach ->
          BackboneFactory.dispose @collection
          @collection = null

        it "should allow cloning of models through the factory", ->
          collection = @collection.clone()
          expect(collection.reduce(
            (m, i)->
              expect(BackboneFactory.verifyTags(i)).toBe true
              m += i.get("id")
            , 0)).toBe 6
          expect(BackboneFactory.verifyTags(collection)).toBe true
          disposeTest = ->
            BackboneFactory.dispose collection
          expect(disposeTest).not.toThrow()

