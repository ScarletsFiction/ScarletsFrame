var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var header = require('gulp-header');
var rename = require('gulp-rename');
var fs = require('fs');
var notifier = require('node-notifier');

var compile, uglify, babel, fast;
gulp.task('enableCompile', function(done){
  uglify = require('gulp-uglify-es').default;
  babel = require("gulp-babel");
  removeOldMap('dist/');

  done && done();
});

var dateMinify = {};
// var dateMinify = {mapFile:function(path){return path.replace('js.map', Date.now()+'.js.map')}};
var theHeader = `/*
  ScarletsFrame
  A frontend library for Scarlets Framework that support
  lazy page load and element binding that can help
  simplify your code

  https://github.com/ScarletsFiction/ScarletsFrame
*/\n`;

var theOrderES5 = [
  'src/sf-polyfill.js',
  'src/sf-a_init.js',
  'src/sf-loader.js',
  'src/sf-dom.js',
  'src/sf-space.js',
  'src/sf-model.js',
  'src/sf-component.js',
  'src/sf-model/*.js',
  'src/**/*.js',
  '!src/sf-hot-reload.js',
  'src/sf-z_end.js',
];

var theOrderES6 = theOrderES5.slice(1);
var devTest = theOrderES6.slice(0);
devTest.splice(-2, 1); // Remove '!src/sf-hot-reload.js'

gulp.task('watch-js', function(){
  removeOldMap('dist/');

  // Set the order
  return gulp.src(devTest)
    .pipe(sourcemaps.init())
    .pipe(concat('scarletsframe.js'))
    .pipe(sourcemaps.write('.', dateMinify))
    .pipe(gulp.dest('dist'))
    .on('end', function(){
      notifier.notify({
        title: 'Gulp Compilation',
        message: 'JavaScript was finished!'
      });
    });
});

gulp.task('js-es5', function(){
  return gulp.src(theOrderES5)
    .pipe(sourcemaps.init())
    .pipe(concat('scarletsframe.js'))
    .pipe(gulp.dest('dist'))
    .pipe(babel({
      babelrc: false,
      presets: [
        [
          "@babel/preset-env", {
            targets: {
              ie: "11"
            },
            modules: false,
            loose: false
          }
        ]
      ]
    }))
    .pipe(uglify())
    .pipe(header(theHeader))
    .pipe(rename({extname:'.min.js'}))
    .pipe(sourcemaps.write('.', dateMinify))
    .pipe(gulp.dest('dist'));
});

gulp.task('js-es6', function(){
  return gulp.src(theOrderES6)
    .pipe(sourcemaps.init())
    .pipe(concat('scarletsframe.es6.js'))
    .pipe(uglify())
    .pipe(header(theHeader))
    .pipe(sourcemaps.write('.', dateMinify))
    .pipe(gulp.dest('dist'));
});

gulp.task('js-hot', function(){
  return gulp.src(devTest)
    .pipe(sourcemaps.init())
    .pipe(concat('scarletsframe.hot.js'))
    .pipe(uglify())
    .pipe(header(theHeader))
    .pipe(sourcemaps.write('.', dateMinify))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', function(){
  require('./tests/server.js');
  gulp.watch(['src/**/*.js'], gulp.series('watch-js'));
});

function ie11(){
  require('./tests/server.js');

  gulp.task('enableCompile')();
  gulp.watch(['src/**/*.js'], gulp.series('js-es5'));
}

gulp.task('ie11', ie11);
gulp.task('compile', gulp.parallel(['enableCompile', 'js-es6', 'js-es5', 'js-hot']));

function swallowError(error){
  console.log(error.message)
  this.emit('end')
}

function removeOldMap(path){
  fs.readdir(path, function(err, files){
     for (var i = 0, len = files.length; i < len; i++) {
        if(files[i].match(/.*\.(js|css)\.map/) !== null){
          try{fs.unlinkSync(path+files[i]);}catch(e){}
        }
     }
  });
}