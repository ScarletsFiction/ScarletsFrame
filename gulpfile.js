const gulp = require('gulp');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const header = require('gulp-header');
const rename = require('gulp-rename');
const fs = require('fs');

// const notifier = require('node-notifier'); // For other OS
const notifier = new require('node-notifier/notifiers/balloon')(); // For Windows

let terser, babel;
gulp.task('enableCompile', function(done){
  terser = require('gulp-terser');
  babel = require("gulp-babel");
  removeOldMap('dist/');

  done && done();
});

const dateMinify = {};
// var dateMinify = {mapFile:function(path){return path.replace('js.map', Date.now()+'.js.map')}};
const theHeader = `/*
  ScarletsFrame (MIT Licensed)
  https://github.com/ScarletsFiction/ScarletsFrame
*/\n`;

const theOrderES5 = [
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

const theOrderES6 = theOrderES5.slice(1);
const devTest = theOrderES6.slice(0);
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
        message: 'JavaScript was finished!',
        timeout: 4, time: 4,
      });
    });
});

gulp.task('js-es5', ()=>
  gulp.src(theOrderES5)
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
            loose: false,
            shippedProposals: true
          }
        ]
      ]
    }))
    .pipe(terser())
    .pipe(header(theHeader))
    .pipe(rename({extname:'.min.js'}))
    .pipe(sourcemaps.write('.', dateMinify))
    .pipe(gulp.dest('dist'))
);

gulp.task('js-es6', ()=>
  gulp.src(theOrderES6)
    .pipe(sourcemaps.init())
    .pipe(concat('scarletsframe.es6.js'))
    .pipe(terser())
    .pipe(header(theHeader))
    .pipe(sourcemaps.write('.', dateMinify))
    .pipe(gulp.dest('dist'))
);

gulp.task('js-hot', ()=>
  gulp.src(devTest)
    .pipe(sourcemaps.init())
    .pipe(concat('scarletsframe.hot.js'))
    .pipe(terser())
    .pipe(header(theHeader))
    .pipe(sourcemaps.write('.', dateMinify))
    .pipe(gulp.dest('dist'))
);

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
    if(err) return;

    for (let i = 0, len = files.length; i < len; i++) {
       if(files[i].match(/.*\.(js|css)\.map/) !== null){
         try{fs.unlinkSync(path+files[i]);}catch(e){}
       }
    }
  });
}
