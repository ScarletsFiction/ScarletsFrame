var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var header = require('gulp-header');
var rename = require('gulp-rename');
var fs = require('fs');
var notifier = require('node-notifier');

var compile, uglify, babel, fast;
function enableCompile(){
  uglify = require('gulp-uglify-es').default;
  babel = require("gulp-babel");
  compile = true;
}

gulp.task('js', function(){
  removeOldMap('dist/');

  // Set the order
  var ret = gulp.src([
      'src/sf-polyfill.js',
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
    .pipe(gulp.dest('dist'));

    // Create minified file (This would be little slower)
    if(compile){
      ret = ret.pipe(babel({
        babelrc: false,
        presets: [
          [
            "@babel/preset-env",
            {
              targets: {
                ie: "11"
              },
              modules: false,
              loose: true
            }
          ]
        ]
      }))
      .pipe(rename('scarletsframe.min.js'));

      if(!fast)
      ret = ret.pipe(uglify()).on('error', swallowError);
    }
    else 
      ret = ret.pipe(rename('scarletsframe.min.js'));

    // Add header so developer can know about this script
    return ret.pipe(header(`/*
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
  require('./tests/server.js');
  gulp.watch(['src/**/*.js'], gulp.series('js'));
});

function ie11(){
  require('./tests/server.js');

  enableCompile();
  gulp.watch(['src/**/*.js'], gulp.series('js'));
}

gulp.task('ie11', ie11);

gulp.task('ie11Fast', function(){
  fast = true;
  ie11();
});

gulp.task('compile', async function(done){
  enableCompile();
  console.log("Please wait a few seconds");
  gulp.task('js')();
});

function swallowError(error){
  console.log(error.message)
  this.emit('end')
}

function removeOldMap(path){
  fs.readdir(path, function(err, files){
     for (var i = 0, len = files.length; i < len; i++) {
        if(files[i].match(/.*\.(js|css)\.map/) !== null)
          fs.unlinkSync(path+files[i]);
     }
  });
}