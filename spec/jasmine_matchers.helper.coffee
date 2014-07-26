# Jasmine 1.x style matchers
jasmine.Matchers::toProvideMethod = (expected) ->
  return typeof @actual[expected] is 'function'

jasmine.Matchers::toBeInstanceOf = (expected) ->
  return @actual instanceof expected

jasmine.Matchers::toBePromise = (expected) ->
  return typeof @actual.done is 'function' and
    typeof @actual.fail is 'function'

jasmine.Matchers::toBeFunction = ->
  return typeof @actual is 'function'

# Jasmine 2.x style matchers
# beforeEach ->
#   jasmine.addMatchers

#     toProvideMethod: (util, customEqualityTesters) ->
#       compare: (actual, expected) ->
#         pass: typeof actual[expected] is 'function'

#     toBeInstanceOf: (util, customEqualityTesters) ->
#       compare: (actual, expected) ->
#         pass: actual instanceof expected

#     toBePromise: (util, customEqualityTesters) ->
#       compare: (actual, expected) ->
#         pass: typeof actual.done is 'function' and
#           typeof actual.fail is 'function'

#     toBeFunction: (util, customEqualityTesters) ->
#       compare: (actual, expected) ->
#         pass: typeof actual is 'function'
