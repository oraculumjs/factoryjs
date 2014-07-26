pkg = require './package.json'
component = require './bower.json'
jasmineTemplate = require 'grunt-template-jasmine-requirejs'

module.exports = (grunt) ->

  grunt.loadNpmTasks 'grunt-bump'
  grunt.loadNpmTasks 'grunt-docker'
  grunt.loadNpmTasks 'grunt-blanket'
  grunt.loadNpmTasks 'grunt-browserify'
  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-contrib-copy'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-jasmine'
  grunt.loadNpmTasks 'grunt-jasmine-node'

  grunt.initConfig
    pkg: pkg
    component: component

    clean:
      docs: ['docs/']
      dist: ['dist/']
      build: ['build/']

    coffeelint:
      src: ['src/**/*.coffee']

    coffee:
      src:
        cwd: 'src/'
        ext: '.js'
        src: ['**/*.coffee']
        dest: 'build/src/'
        expand: true
        flatten: false
      spec:
        expand: true
        flatten: false
        cwd: 'spec/'
        src: ['**/*.spec.coffee']
        dest: 'build/spec/'
        ext: '.spec.js'
      helper:
        expand: true
        flatten: false
        cwd: 'spec/'
        src: ['**/*.helper.coffee']
        dest: 'build/spec/'
        ext: '.helper.js'

    browserify:
      build:
        files:
          'build/src/Factory.umd.js': ['src/Factory.coffee']
        options:
          transform: ['coffeeify']
      spec:
        files:
          'build/spec-umd/jasmine.js': ['spec/**/*.coffee']
        options:
          transform: ['coffeeify']
          require: ['underscore']

    blanket:
      instrument:
        files:
          'build/src-cov/': ['build/src/']

    jasmine_node:
      all: ['spec']
      options:
        match: '.'
        coffee: true
        matchall: false
        forceExit: true
        useHelpers: true
        extensions: 'coffee'
        specNameMatcher: 'spec'
        includeStackTrace: false
        helperNameMatcher: 'helper'

    connect:
      test:
        options:
          port: 9001

    jasmine:
      normal:
        src: ['build/spec-umd/jasmine.js']
      live:
        src: ['build/spec-umd/jasmine.js']
        options:
          host: 'http://localhost:9001'
          keepRunner: true

    jshint:
      all: ['build/src/*.js']
      options:
        boss: true
        expr: true
        eqnull: true
        shadow: true
        newcap: false
        supernew: true
        validthis: true

    watch:
      docs:
        files: ['*.md']
        tasks: ['docs']
      coffee:
        files: ['src/**/*.coffee', 'spec/**/*.coffee']
        tasks: ['build', 'docs']
      scripts:
        files: ['build/src/**/*.js']
        tasks: ['jasmine:live', 'jasmine_node', 'dist']

    docker:
      options:
        colourScheme: 'monokai'
      factoryjs:
        dest: 'docs/'
        src: ['*.md', 'src/**/*.coffee']

    copy:
      dist:
        files: [{
          cwd: 'build/src/'
          src: ['**/*.js']
          dest: 'dist/'
          expand: true
        }]

    uglify:
      options:
        banner: '/*! <%= pkg.name %> <%= pkg.version %> */\n'
        preserveComments: 'all'
      factory:
        files:
          'dist/Factory.min.js': ['dist/Factory.js']
          'dist/Factory.umd.min.js': ['dist/Factory.umd.js']

    bump:
      options:
        push: false
        commit: false
        createTag: false
        files: ['package.json', 'bower.json']
        updateConfigs: ['pkg', 'component']

  grunt.registerTask 'build', [
    'clean:build'
    'coffeelint'
    'coffee'
    'jshint'
    'browserify'
    'blanket'
  ]

  grunt.registerTask 'docs', [
    'clean:docs'
    'docker'
  ]

  grunt.registerTask 'dist', [
    'clean:dist'
    'copy:dist'
    'uglify'
  ]

  grunt.registerTask 'default', [
    'build'
    'jasmine:normal'
    'jasmine_node'
    'docs'
    'dist'
  ]

  grunt.registerTask 'live', [
    'build'
    'connect:test'
    'jasmine:live'
    'jasmine_node'
    'watch'
    'dist'
  ]
