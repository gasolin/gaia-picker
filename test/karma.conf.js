
module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'sinon-chai'],
    browsers: ['firefox_latest'],
    client: { mocha: { 'ui': 'tdd' } },
    basePath: '../',

    customLaunchers: {
      firefox_latest: {
        base: 'FirefoxNightly',
        prefs: { 'dom.webcomponents.enabled': true }
      }
    },

    files: [
      'lib/snap-scroll.js',
      'gaia-picker.js',
      'gaia-picker-time.js',
      'gaia-picker-date.js',
      'test/gaia-picker.js',
      'test/gaia-picker-time.js',
      'test/gaia-picker-date.js'
    ]
  });
};
