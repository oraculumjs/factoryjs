pkg = require './package.json'
component = require './bower.json'
requireConfig = require './require-config.json'
requirejsTemplate = require 'grunt-template-jasmine-requirejs'

module.exports = (grunt) ->

  grunt.loadNpmTasks 'grunt-bump'
  grunt.loadNpmTasks 'grunt-docker'
  grunt.loadNpmTasks 'grunt-gitinfo'
  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-jasmine'

  grunt.initConfig
    pkg: pkg
    component: component

    connect:
      server:
        options:
          port: 9002

    clean:
      docs: ['docs/']
      dist: ['dist/']
      build: ['build/']

    coffee:
      src:
        expand: true
        flatten: false
        cwd: 'src/'
        src: ['**/*.coffee']
        dest: 'build/src/'
        ext: '.js'
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

    coffeelint:
      app: ['src/**/*.coffee']

    jasmine:
      normal:
        src: ['build/src/**/*.js']
        options:
          specs: [
            'build/spec/**/*.helper.js'
            'build/spec/**/*.spec.js'
          ]
          template: requirejsTemplate
          templateOptions: {
            version: '2.0.6'
            requireConfig: requireConfig
          }
          helpers: [
            'bower_components/sinonjs/sinon.js'
            'bower_components/jasmine-sinon/lib/jasmine-sinon.js'
            'bower_components/jasmine-expect/dist/jasmine-matchers.js'
          ]
      live:
        src: ['build/src/**/*.js']
        options:
          host: 'http://localhost:9002'
          specs: [
            'build/spec/**/*.helper.js'
            'build/spec/**/*.spec.js'
          ]
          styles: ['lib/jscoverage/jscoverage.css']
          template: requirejsTemplate
          templateOptions: {
            version: '2.0.6'
            requireConfig: requireConfig
          }
          keepRunner: true
          helpers: [
            'bower_components/sinonjs/sinon.js'
            'bower_components/jasmine-sinon/lib/jasmine-sinon.js'
            'bower_components/jasmine-expect/dist/jasmine-matchers.js'
          ]

    concat:
      options:
        banner: "/* <%- pkg.name %> <%- pkg.version %> */\n"
        process: true
      factory:
        src: ['build/src/Factory.js']
        dest: 'dist/Factory.js'
      backbone_factory:
        src: ['build/src/BackboneFactory.js']
        dest: 'dist/BackboneFactory.js'

    uglify:
      options:
        banner: "/* <%- pkg.name %> <%- pkg.version %> */\n"
      factory:
        files:
          'dist/Factory.min.js': ['build/src/Factory.js']
          'dist/BackboneFactory.min.js': ['build/src/BackboneFactory.js']

    watch:
      docs:
        files: ['*.md']
        tasks: ['docs']
      coffee:
        files: ['src/**/*.coffee', 'spec/**/*.coffee']
        tasks: ['coffeelint', 'build', 'docs']
      scripts:
        files: ['build/src/**/*.js']
        tasks: ['jshint', 'jasmine:live', 'dist']
        options: livereload: true

    jshint:
      all: ['build/src/*.js']
      options:
        boss: true
        expr: true
        eqnull: true
        shadow: true
        supernew: true

    docker:
      options:
        css: ['assets/css/docker.css']
        colourScheme: 'monokai'
      factoryjs:
        dest: 'docs/'
        src: [
          '*.md'
          'src/**/*.coffee'
        ]

    bump:
      options:
        push: false
        commit: false
        createTag: false
        files: ['package.json', 'bower.json']
        updateConfigs: ['pkg', 'component']

  grunt.registerTask 'build', [
    'clean:build'
    'coffee'
  ]

  grunt.registerTask 'docs', [
    'clean:docs'
    'docker'
  ]

  grunt.registerTask 'dist', [
    'clean:dist'
    'gitinfo'
    'concat'
    'uglify'
  ]

  grunt.registerTask 'default', [
    'coffeelint'
    'build'
    'jshint'
    'jasmine:normal'
    'dist'
  ]

  grunt.registerTask 'live', [
    'coffeelint'
    'build'
    'jshint'
    'connect'
    'jasmine:live'
    'watch'
    'dist'
  ]
