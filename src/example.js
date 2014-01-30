
/*
ENTIRELY CONTRIVED EXAMPLE!!
----------------------------
 */

(function() {
  define(["Factory"], function(Factory) {
    var TestFactory, TestObject, firstSuite, firstTest, runner, secondTest, thirdTest;
    TestObject = function(options) {
      if (!options) {
        options = {};
      }
      this.name = options.name || this.defaults.name;
      this.passed = false;
      this.execute = options.execute || this.defaults.execute;
      if (typeof this.construct === "function") {
        return this.construct(options);
      }
    };
    TestObject.prototype = {
      name: "NONE",
      defaults: {
        execute: function() {}
      }
    };
    TestFactory = new Factory(TestObject);
    TestFactory.extend("Base", "Test", {
      defaults: {
        name: "Unamed Test Object",
        execute: function() {}
      },
      run: function() {
        this.passed = this.execute();
        return this.passed;
      },
      clean: function() {
        return TestFactory.dispose(this);
      }
    }, {
      mixins: ["Logging"],
      tags: ["Logging"]
    });
    TestFactory.extend("Test", "Suite", {
      construct: function(options) {
        this.tests = [];
        return this;
      },
      addTest: function(test) {
        this.tests.push(test);
        return this;
      },
      clean: function() {
        var test;
        test = void 0;
        while (test = this.tests.shift()) {
          test.clean();
        }
        return TestFactory.dispose(this);
      },
      defaults: {
        name: "Unnamed Test Suite",
        execute: function() {
          var result;
          result = 0;
          this.log('log', this.Runner.url());
          this.tests.forEach(function(test) {
            test.log("log", test.name, test.run());
            if (test.passed) {
              return result++;
            }
          });
          return result === this.tests.length;
        }
      }
    }, {
      mixins: ["Logging"],
      tags: ["Logging"],
      injections: ['Runner']
    });
    TestFactory.defineMixin("Logging", {
      log: function(severity) {
        var args;
        args = [].slice.call(arguments, 1);
        return console[severity].apply(console, args);
      }
    });
    TestFactory.define("Runner", function() {
      var suites, url;
      url = window.location;
      suites = [];
      this.url = function() {
        return url;
      };
      this.addSuite = function(suite) {
        suites.push(suite);
        return this;
      };
      this.run = function() {
        suites.forEach(function(suite) {
          return suite.log("log", suite.name, suite.run());
        });
        return this;
      };
      this.clean = function() {
        var suite;
        suite = void 0;
        while (suite = suites.shift()) {
          suite.clean();
        }
        return this;
      };
      return this;
    }, {
      singleton: true,
      mixins: ["Logging"],
      tags: ["Logging"]
    });
    runner = TestFactory.get("Runner");
    firstSuite = TestFactory.get("Suite");
    firstTest = TestFactory.get("Test", {
      name: "0 is 0",
      execute: function() {
        var x, y;
        x = 0;
        y = 0;
        return x === y;
      }
    });
    secondTest = TestFactory.get("Test", {
      name: "0 is 1",
      execute: function() {
        var x, y;
        x = 1;
        y = 0;
        return x === y;
      }
    });
    firstSuite.addTest(firstTest).addTest(secondTest);
    runner.addSuite(firstSuite);
    runner.run();
    TestFactory.onTag("Logging", function(instance) {
      var oLog;
      oLog = instance.log;
      return instance.log = function() {
        console.log("MAKING AN AJAX CALL HAR HAR");
        return oLog.apply(instance, arguments);
      };
    });
    thirdTest = TestFactory.get("Test", {
      name: "True is False",
      execute: function() {
        return true === false;
      }
    });
    firstSuite.addTest(thirdTest);
    runner.run();
    return runner.clean();
  });

}).call(this);
