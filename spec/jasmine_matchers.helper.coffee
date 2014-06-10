beforeEach ->
  jasmine.addMatchers

    toProvideMethod: (util, customEqualityTesters) ->
      compare: (actual, expected) ->
        pass: typeof actual[expected] is 'function'

    toBeInstanceOf: (util, customEqualityTesters) ->
      compare: (actual, expected) ->
        pass: actual instanceof expected

    toBePromise: (util, customEqualityTesters) ->
      compare: (actual, expected) ->
        pass: typeof actual.done is 'function' and
          typeof actual.fail is 'function'

    toBeFunction: (util, customEqualityTesters) ->
      compare: (actual, expected) ->
        pass: typeof actual is 'function'
