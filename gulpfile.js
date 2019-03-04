var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var csso = require('gulp-csso');
var uglify = require('gulp-uglify-es').default;
var autoprefixer = require('gulp-autoprefixer');
var header = require('gulp-header');
var rename = require('gulp-rename');
var babel = require('gulp-babel');
var fs = require('fs');
var notifier = require('node-notifier');
var order = require("gulp-order");

gulp.task('js', function(){
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(order([
      'sf-a_init.js',
      'sf-polyfill.js',
      'sf-dom.js',
      'sf-loader.js',
      'sf-model.js',
      '**/*.js',
      'sf-z_end.js'
    ]))
    .pipe(concat('scarletsframe.js'))
    /*.pipe(babel({
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              ie: 10
            },
            loose:true,
            modules: false
          }
        ]
      ]
    }))*/
    .pipe(gulp.dest('dist'))

    .pipe(rename('scarletsframe.min.js'))
    .on('error', swallowError)
    .pipe(uglify())
    .on('error', swallowError)
    .pipe(header(`/*
  ScarletsFrame
  A frontend library for Scarlets Framework that support
  lazy page load and element binding that can help
  simplify your code

  https://github.com/ScarletsFiction/ScarletsFrame
*/\n`))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist')).on('end', function(){
      notifier.notify({
        title: 'Gulp Compilation',
        message: 'JavaScript was finished!'
      });
    });
});

gulp.task('watch', function(){
  gulp.watch(['src/**/*.js'], gulp.series('js'));
});

gulp.task('serve', function(){
  browserSync({
    server: {
      baseDir: 'example'
    }
  });

  gulp.watch(['*.html', 'styles/**/*.css', 'scripts/**/*.js'], {cwd: 'example'}, reload);
});

gulp.task('default', gulp.series('js'));

function swallowError(error){
  console.log(error.message)
  this.emit('end')
}