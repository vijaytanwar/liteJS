/**
 * Grunt config file
 */
module.exports = function (grunt) {
    grunt.initConfig({
        pkg: require("./package.json"),
        concat: {
            options: {
                separator: '\n',
            },
            liteJS: {
                src: ['liteJS/liteJS.js',
                    'liteJS/liteJS-ajax.js',
                    'liteJS/liteJS-query.js',
                    'liteJS/liteJS-promise.js',
                    'liteJS/liteJS-router.js',
                    'liteJS/navigo.js'
                ],
                dest: 'dist/liteJS-debug.<%= pkg.version %>.js',
            }
        },
        uglify: {
            options: {
                mangle: true,
                compress: true,
                sourceMap: false,
                compress: {
                    drop_console: true
                },
                beautify: {
                    beautify: false
                }
            },
            js: {
                files: {
                    'dist/liteJS-<%= pkg.version %>.min.js': [
                        'liteJS/liteJS.js',
                        'liteJS/liteJS-ajax.js',
                        'liteJS/liteJS-query.js',
                        'liteJS/liteJS-promise.js',
                        'liteJS/liteJS-router.js',
                        'liteJS/navigo.js'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['concat', 'uglify']);
};