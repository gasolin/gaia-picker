/*global window,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true*/

suite('GaiaPicker', function() {
  'use strict';

  /**
   * Dependencies
   */

  var GaiaPicker = window['gaia-picker'];

  /**
   * Locals
   */

  var proto = GaiaPicker.proto;
  var container;

  suiteSetup(function(done) {
    if (document.readyState !== 'complete') {
      addEventListener('load', function() {
        done();
      });

      return;
    }

    done();
  });

  setup(function() {
    this.sinon = sinon.sandbox.create();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  teardown(function() {
    this.sinon.restore();
    proto.doc = document;
    container.remove();
  });

  test('It has an item height of 50px', function() {
    var el = create();
    assert.equal(el.itemHeight, 50);
  });

  suite('GaiaPicker#setup()', function() {
    setup(function() {
      this.clock = sinon.useFakeTimers();
      this.el = create();
      this.clock.tick(500);
    });

    teardown(function() {
      this.clock.restore();
    });
  });

  function create(options) {
    options = options || {};

    var style = options.height ? 'style="height:' + options.height + 'px"' : '';

    container.innerHTML = `
      <gaia-picker ${style}>
        <li>1</li>
        <li>2</li>
        <li>3</li>
        <li>4</li>
        <li>5</li>
        <li>6</li>
        <li>7</li>
        <li>8</li>
        <li>9</li>
        <li>10</li>
        <li>11</li>
        <li>12</li>
      </gaia-picker>`;

    return container.firstElementChild;
  }
});