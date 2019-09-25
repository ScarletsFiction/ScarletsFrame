var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify-es').default;
var header = require('gulp-header');
var rename = require('gulp-rename');
var fs = require('fs');
var notifier = require('node-notifier');

require('./tests/server.js');

gulp.task('js', function(){
  removeOldMap('dist/');

  // Set the order
  return gulp.src([
      'src/sf-a_init.js',
      'src/sf-dom.js',
      'src/sf-loader.js',
      'src/sf-component.js',
      'src/sf-model.js',
      'src/sf-model/*.js',
      'src/**/*.js',
      'src/sf-z_end.js',
    ]).pipe(sourcemaps.init())

    // Save as combined script
    .pipe(concat('scarletsframe.js'))
    .pipe(gulp.dest('dist'))

    // Create minified file (This would be little slower)
    .pipe(rename('scarletsframe.min.js')).on('error', swallowError)
    .pipe(uglify()).on('error', swallowError)

    // Add header so developer can know about this script
    .pipe(header(`/*
  ScarletsFrame
  A frontend library for Scarlets Framework that support
  lazy page load and element binding that can help
  simplify your code

  https://github.com/ScarletsFiction/ScarletsFrame
*/\n`))
    .pipe(sourcemaps.write('.', {
      mapFile: function(mapFilePath) {
        return mapFilePath.replace('js.map', Date.now()+'.js.map');
      }}))
    .pipe(gulp.dest('dist')).on('end', function(){
      notifier.notify({
        title: 'Gulp Compilation',
        message: 'JavaScript was finished!'
      });
    });
});

gulp.task('default', function(){
  gulp.watch(['src/**/*.js'], gulp.series('js'));
});

function swallowError(error){
  console.log(error.message)
  this.emit('end')
}

function removeOldMap(path){
  fs.readdir(path, function(err, files){
     for (var i = 0, len = files.length; i < len; i++) {
        if(files[i].match(/.*\.min.*\.(js|css)\.map/) !== null)
          fs.unlinkSync(path+files[i]);
     }
  });
}