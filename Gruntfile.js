module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    connect: {
      server: {
        options: {
          port: 9001
        }
      }
    },
    clean: {
      build: ['build', 'docs', 'src-cov']
    },
    coffee: {
      src: {
        expand: true,
        flatten: false,
        cwd: 'coffee/src/',
        src: ['**/*.coffee'],
        dest: 'src/',
        ext: '.js'
      },
      spec: {
        expand: true,
        flatten: false,
        cwd: 'coffee/spec/',
        src: ['**/*.spec.coffee'],
        dest: 'spec/',
        ext: '.spec.js'
      },
      helper: {
        expand: true,
        flatten: false,
        cwd: 'coffee/spec/',
        src: ['**/*.helper.coffee'],
        dest: 'spec/',
        ext: '.helper.js'
      }
    },
    blanket: {
      instrument: {
        files: {
          'src-cov/': ['src/']
        }
      }
    },
    jasmine: {
      live: {
        src: 'src-cov/*.js',
        options: {
          template: require("grunt-template-jasmine-requirejs"),
          templateOptions: {
            requireConfigFile: 'src-cov/main.js'
          },
          host: 'http://localhost:9001',
          outfile: 'specs.html',
          specs: 'spec/**/*.spec.js',
          helpers: 'spec/**/*.helper.js',
          keepRunner: true
        }
      },
      normal: {
        src: 'src-cov/*.js',
        options: {
          template: require("grunt-template-jasmine-requirejs"),
          templateOptions: {
            requireConfigFile: 'src-cov/main.js'
          },
          specs: 'spec/**/*.spec.js',
          helpers: 'spec/**/*.helper.js',
        }
      }
    },
    concat: {
      factory: {
        src: ['src/Factory.js'],
        dest: 'build/Factory.js'
      },
      backbone_factory: {
        src: ['src/BackboneFactory.js'],
        dest: 'build/BackboneFactory.js'
      },
      docs: {
        src: ['README.html'],
        dest: 'index.html'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= pkg.version %> */\n'
      },
      factory: {
        files: {
          'build/Factory.min.js': ['src/Factory.js'],
          'build/BackboneFactory.min.js': ['src/BackboneFactory.js']
        }
      }
    },
    watch: {
      docs: {
        files: ['*.md'],
        tasks: ['markdown', 'concat:docs']
      },
      coffee: {
        files: ['coffee/**/*.coffee'],
        tasks: ['coffee', 'docco:coffee']
      },
      scripts: {
        files: ['src/**/*.js', 'spec/**/*.js'],
        tasks: ['jshint','blanket','jasmine:live','concat','docco','uglify'],
        options: {
          livereload: true
        }
      }
    },
    jshint: {
      all: ['src/*.js'],
      options: {
        eqnull: true,
        boss: true,
        shadow: true,
        expr: true,
        supernew: true
      }
    },
    docco: {
      coffee: {
        src: ['coffee/src/Factory.coffee', 'coffee/src/BackboneFactory.coffee'],
        options: {
          output: 'docs/coffee/'
        }
      }
    },
    markdown: {
      all: {
        files: [{
          expand: true,
          src: 'README.md',
          dest: '.',
          ext: '.html'
        }]
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-markdown');
  grunt.loadNpmTasks('grunt-docco');
  grunt.loadNpmTasks('grunt-blanket');

  grunt.registerTask('default', ['clean', 'coffee','jshint','blanket','jasmine:normal','docco','markdown','concat','uglify']);
  grunt.registerTask('live', ['clean','connect', 'coffee','jshint','blanket','jasmine:live','docco','markdown','concat','uglify', 'watch']);
};