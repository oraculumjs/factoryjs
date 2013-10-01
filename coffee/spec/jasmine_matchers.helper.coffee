require ['underscore'], (_)->
  beforeEach ->
    toProvideMethod = (expected)->
      typeof @actual[expected] is "function"

    @addMatchers
      toProvideMethod: toProvideMethod
      toBeInstanceOf: (expected) ->
        @actual instanceof expected
      toBePromise: ->
        return toProvideMethod.call(this, 'done') and
          toProvideMethod.call(this, 'fail')
      toBeFunction: (expected) ->
        typeof @actual is 'function'