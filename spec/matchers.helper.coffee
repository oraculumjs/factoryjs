beforeEach ->
  jasmine.addMatchers

    toBeType: (util, customEqualityTesters) ->
      compare: (actual, expected) ->
        return pass: actual.__type() is expected

    toHaveTag: (util, customEqualityTesters) ->
      compare: (actual, expected) ->
        return pass: expected in actual.__tags()

    toUseMixin: (util, customEqualityTesters) ->
      compare: (actual, expected) ->
        return pass: expected in actual.__mixins()

    toProvideMethod: (util, customEqualityTesters) ->
      compare: (actual, expected) ->
        pass: typeof actual[expected] is 'function'

    toBeInstanceOf: (util, customEqualityTesters) ->
      compare: (actual, expected) ->
        pass: actual instanceof expected

    toBePromise: (util, customEqualityTesters) ->
      compare: (actual, expected) -> # ducktyping
        pass: typeof actual.done is 'function' and
          typeof actual.fail is 'function'

    toBeFunction: (util, customEqualityTesters) ->
      compare: (actual, expected) ->
        pass: typeof actual is 'function'
