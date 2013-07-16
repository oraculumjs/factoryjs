require.config
  baseUrl: "src-cov"
  paths:
    jquery: "../lib/jquery"
    underscore: "../lib/underscore"
    backbone: "../lib/backbone"

  shim:
    jquery:
      exports: "$"

    underscore:
      exports: "_"

    backbone:
      deps: ["underscore", "jquery"]
      exports: "Backbone"

  deps: ["../lib/jscoverage"]

