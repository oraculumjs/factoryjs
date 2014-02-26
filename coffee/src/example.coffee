###
ENTIRELY CONTRIVED EXAMPLE!!
----------------------------
###
define ["Factory"], (Factory) ->
  # this explicitly supposes a single options hash constructor
  TestObject = (options) ->
    options = {}  unless options
    @name = options.name or @defaults.name
    @passed = false
    @execute = options.execute or @defaults.execute
    @construct options  if typeof @construct is "function"

  TestObject:: =
    name: "NONE"
    defaults:
      execute: ->

  TestFactory = new Factory(TestObject)

  # from here on out you can define new object types or extend your original
  # object type in the container
  TestFactory.extend "Base", "Test",
    defaults:
      name: "Unamed Test Object"
      execute: ->

    run: ->
      @passed = @execute()
      @passed

    clean: ->
      TestFactory.dispose this
  ,
    mixins: ["Logging"]
    tags: ["Logging"]

  TestFactory.extend "Test", "Suite",
    construct: (options) ->
      @tests = []
      this

    addTest: (test) ->
      @tests.push test
      this

    clean: ->
      test = undefined
      test.clean()  while test = @tests.shift()
      TestFactory.dispose this

    defaults:
      name: "Unnamed Test Suite"
      execute: ->
        result = 0
        # Here are using the Runner injection to access the runner for the page,
        # good for accessing singletons that have commone reusable
        # functionality.
        @log 'log', @runner.url()
        @tests.forEach (test) ->
          test.log "log", test.name, test.run()
          result++  if test.passed

        result is @tests.length
  ,
    mixins: ["Logging"]
    tags: ["Logging"],
    injections: {
      runner: 'Runner'
    }


  # now you can get a Suite object out of the factory

  # there are three options that can additionally be passed in to the define or
  # extend methods:
  # mixins: Array
  # tags: Array
  # singleton: Boolean
  TestFactory.defineMixin "Logging",
    log: (severity) ->
      args = [].slice.call(arguments, 1)
      console[severity].apply console, args

  TestFactory.define "Runner", ->
    url = window.location
    suites = []
    @url = ()->
      return url
    @addSuite = (suite) ->
      suites.push suite
      return this
    @run = ->
      suites.forEach (suite) ->
        suite.log "log", suite.name, suite.run()
      return this

    @clean = ->
      suite = undefined
      suite.clean() while suite = suites.shift()
      return this
    return this
  ,
    singleton: true
    mixins: ["Logging"]
    tags: ["Logging"] # because mixins don't infer type

  runner = TestFactory.get("Runner")
  firstSuite = TestFactory.get("Suite")
  firstTest = TestFactory.get("Test",
    name: "0 is 0"
    execute: ->
      x = 0
      y = 0
      x is y
  )
  secondTest = TestFactory.get("Test",
    name: "0 is 1"
    execute: ->
      x = 1
      y = 0
      x is y
  )
  firstSuite.addTest(firstTest).addTest secondTest
  runner.addSuite firstSuite
  runner.run()

  # now let's do something interesting with logging
  TestFactory.onTag "Logging", (instance) ->
    oLog = instance.log
    instance.log = ->

      # pretend to make an ajax call
      console.log "MAKING AN AJAX CALL HAR HAR"
      oLog.apply instance, arguments


  # now any existing instance that supports logging (tagged) will post the log
  # to a server endpoint
  thirdTest = TestFactory.get("Test",
    name: "True is False"
    execute: ->
      true is false
  )
  firstSuite.addTest thirdTest

  # even if they are created after the logging was modified
  runner.run()
  runner.clean()

