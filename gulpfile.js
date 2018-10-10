var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var csso = require('gulp-csso');
var uglify = require('gulp-uglify-es').default;
var autoprefixer = require('gulp-autoprefixer');
var header = require('gulp-header');

gulp.task('js', function(){
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(concat('scarletsframe.min.js'))
    //.pipe(uglify())
    .pipe(header(`/*
  ScarletsFrame
  A frontend library for Scarlets Framework that support
  lazy page load and element binding that can help
  simplify your code

  https://github.com/ScarletsFiction/ScarletsFrame
*/\n`))
    .on('error', console.error)
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
  gulp.watch(['src/**/*.js'], ['js']);
});

gulp.task('serve', function() {
  browserSync({
    server: {
      baseDir: 'example'
    }
  });

  gulp.watch(['*.html', 'styles/**/*.css', 'scripts/**/*.js'], {cwd: 'example'}, reload);
});

gulp.task('css', function () {
  return gulp.src('src/**/*.css')
    .pipe(autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
    .pipe(csso())
    .pipe(gulp.dest('./dist/css'))
});

gulp.task('default', ['js']);