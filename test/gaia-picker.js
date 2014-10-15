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
    this.sandbox = sinon.sandbox.create();
    container = document.createElement('div');
    document.body.appendChild(container);
    this.picker = create();
  });

  teardown(function() {
    this.sandbox.restore();
    proto.doc = document;
    container.remove();
  });

  test('It has an item height of 50px', function() {
    assert.equal(this.picker.itemHeight, 50);
  });

  test('It selects the first item in the list by default', function() {
    assert.isTrue(this.picker.children[0].classList.contains('selected'));
  });

  suite('GaiaPicker#setup()', function() {
    test('It sets extra bottom-padding to account for the y-offset of the list', function () {
      assert.equal(create().els.list.style.paddingBottom, '150px');
      assert.equal(create({ height: 400 }).els.list.style.paddingBottom, '350px');
      assert.equal(create({ height: 550 }).els.list.style.paddingBottom, '500px');
    });

    test('It flags as setup', function() {
      assert.isTrue(this.picker.isSetup);
    });

    test('It waits until document has loaded', function() {
      proto.doc = { readyState: 'not-complete' };
      this.sandbox.spy(proto, 'select');

      var picker = create();

      sinon.assert.notCalled(picker.select);

      proto.doc.readyState = 'complete';
      dispatchEvent(new CustomEvent('load'));

      sinon.assert.called(picker.select);
    });

    test('It calls .select() with the last called value', function() {
      proto.doc = { readyState: 'not-complete' };
      this.sandbox.spy(proto, 'select');

      var picker = create();
      picker.select(10);

      proto.doc.readyState = 'complete';
      dispatchEvent(new CustomEvent('load'));

      sinon.assert.calledWith(picker.select, 10);
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

  // function create() {
  //   var el = new GaiaPicker();
  //   el.fill([1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]);
  //   container.appendChild(el);
  //   return el;
  // }
});