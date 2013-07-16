(function() {
  require(['underscore'], function(_) {
    return beforeEach(function() {
      var toProvideMethod;
      toProvideMethod = function(expected) {
        return typeof this.actual[expected] === "function";
      };
      return this.addMatchers({
        toProvideMethod: toProvideMethod,
        toBeInstanceOf: function(expected) {
          return this.actual instanceof expected;
        },
        toBePromise: function() {
          return toProvideMethod.call(this, 'done') && toProvideMethod.call(this, 'fail');
        }
      });
    });
  });

}).call(this);
