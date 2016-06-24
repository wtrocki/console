'use strict';

const fs = require('fs');
const exec = require('child_process').exec;

const del = require('del');
const gulp = require('gulp');
const sass = require('gulp-sass');
const templateCache = require('gulp-angular-templatecache');
const runSequence = require('run-sequence');
const eslint = require('gulp-eslint');
const uglify = require('gulp-uglify');
const ngAnnotate = require('gulp-ng-annotate');
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const htmlReplace = require('gulp-html-replace');
const karma = require('karma').server;
const browserify = require('browserify');
const watchify = require('watchify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const streamify = require('gulp-streamify');
const PrettyError = require('pretty-error');

const entry = './public/_app.js';
const distDir = './public/dist';
const templateSrc = [
  './public/{module,page}/**/*.html',
  './public/lib/mochi/img/tectonic-logo.svg',
];

const lintableSrc = [
  './public/*.js',
  './public/{module,page}/**/*.js',
  '!./public/dist/*.js',
];

let CURRENT_SHA;

function isExternalModule (file) {
  // lifted from browserify!!!
  var regexp = process.platform === 'win32' ?
      /^(\.|\w:)/ :
      /^[\/.]/;
  return !regexp.test(file);
}

const externals = [];
function jsBuild (debug) {
  const opts = {
    debug,
    cache: {},
    packageCache: {},
    exclude: [
      './public/{module,page}/**/*_test.js',
      './public/dist/*.js',
    ],
    transform: [babelify],
    entries: [entry],
    filter: (file) => {
      const isExternal = isExternalModule(file);
      isExternal && externals.push(file);
      return !isExternal;
    },
  };
  if (debug) {
    opts.plugin = [watchify];
    opts.delay = 200;
  }
  return browserify(opts);
}

gulp.task('js-deps', ['js-build'], () => {
  // HACK: we rely on the externals being created by js-build (jsBuild)
  browserify()
  .require(externals)
  .bundle()
  .pipe(source('deps.js'))
  .pipe(gulp.dest(distDir))
});


// Compile all the js source code.
gulp.task('js-build', ['templates'], function() {
  return jsBuild(false)
    .bundle()
    // .pipe(rename({ suffix: '.min' }))
    .pipe(source('app-bundle.js'))
    .pipe(ngAnnotate())
    .pipe(streamify(uglify()))
    .pipe(gulp.dest(distDir))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(distDir));
});


gulp.task('browserify', () => {
  const b = jsBuild(true);
  const bundler = (id) => {
    b.bundle().pipe(fs.createWriteStream(`${distDir}/app-bundle.js`));
    // eslint-disable-next-line no-console
    console.log(`updated ${distDir}/app-bundle.js to ${id}`);
  };

  b.on('update', bundler).on('error', (err) => {
    // eslint-disable-next-line no-console
    console.log(new PrettyError().render(err));

    this.emit('end');
  });

  bundler();
});

gulp.task('sha', function(cb) {
  exec('git rev-parse HEAD', function(err, stdout) {
    if (err) {
      // eslint-disable-next-line no-console
      console.log('Error retrieving git SHA.');
      cb(false);
      return;
    }
    CURRENT_SHA = stdout.trim();
    // eslint-disable-next-line no-console
    console.log('sha: ', CURRENT_SHA);
    cb();
  });
});

// Delete ALL generated files.
gulp.task('clean', function () {
  return del(distDir);
});

gulp.task('clean-package', function () {
  return del([
    distDir + '/style.css',
    distDir + '/app.min.js',
    distDir + '/app.js',
    distDir + '/templates.js'
  ]);
});

gulp.task('sass', function () {
  return gulp.src('./public/style.scss')
    .pipe(sass({
      includePaths: ['./public/lib/coreos-web/sass']
    }))
    .pipe(gulp.dest('./public/dist'));
});

gulp.task('lint', function() {
  return gulp.src(lintableSrc)
    .pipe(eslint({ useEslintrc: true }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

// Precompile html templates.
gulp.task('templates', function() {
  return gulp.src(templateSrc)
    .pipe(templateCache({ standalone: true, root: '/static/' }))
    .pipe(gulp.dest(distDir));
});

// Copy any static assets.
gulp.task('assets', function() {
  // images
  gulp.src([ 'public/img/**/*' ])
    .pipe(gulp.dest('public/dist/img'));
});

// Copy all deps to dist folder for packaging.
gulp.task('copy-deps', function() {
  return gulp.src('./public/lib/**/*')
    .pipe(gulp.dest(distDir + '/lib'));
});

// Combine all the js into the final build file.
gulp.task('js-package', ['js-build', 'js-deps', 'assets', 'copy-deps', 'sha'], function () {
  // NOTE: File Order Matters.
  return gulp.src([
    distDir + '/deps.js',
    distDir + '/app-bundle.min.js'
  ])
  .pipe(concat('build.' + CURRENT_SHA + '.min.js'))
  .pipe(gulp.dest(distDir));
});

// Minify app css.
gulp.task('css-build', ['sass'], function () {
  return gulp.src(['public/dist/style.css'])
    .pipe(concat('public/dist/deps.css'))
    .pipe(rename('app-bundle.css'))
    .pipe(gulp.dest(distDir));
});

gulp.task('css-sha', ['css-build', 'sha'], function () {
  return gulp.src(distDir + '/app-bundle.css')
    .pipe(rename('build.' + CURRENT_SHA + '.css'))
    .pipe(gulp.dest(distDir));
});

// Replace code blocks in html with build versions.
gulp.task('html', ['sha'], function() {
  return gulp.src('./public/index.html')
    .pipe(htmlReplace({
      'js':  '/static/build.' + CURRENT_SHA + '.min.js',
      'css': '/static/build.' + CURRENT_SHA +'.css',
      'css-coreos-web':  '/static/lib/coreos-web/coreos.css'
    }))
    .pipe(gulp.dest(distDir));
});

// Live-watch development mode.
// Auto-compiles: sass & templates.
// Auto-runs: eslint & unit tests.
gulp.task('dev', ['css-build', 'templates', 'browserify'], function() {
  gulp.watch(templateSrc, ['templates']);
  gulp.start('browserify');
  gulp.watch('./public/{.,page,style,module}/**/*.scss', ['css-build']);
});

/**
 * Karma test
 */
gulp.task('test', ['lint', 'js-build', 'js-deps'], function (cb) {
  karma.start({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, cb);
});

gulp.task('default', function(cb) {
  // Run in order.
  runSequence(
    ['clean', 'lint'],
    ['js-package', 'css-sha', 'html'],
    'clean-package',
    cb);
});
