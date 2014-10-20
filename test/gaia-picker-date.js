/*global window,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true*/

suite('GaiaPickerDate', function() {
  'use strict';

  /**
   * Dependencies
   */

  var GaiaPickerDate = window['gaia-picker-date'];

  /**
   * Locals
   */

  var container;

  setup(function() {
    this.sinon = sinon.sandbox.create();
    container = document.createElement('div');
    document.body.appendChild(container);

    navigator.mozL10n = navigator.mozL10n || { get: function() {} };
    this.sinon.stub(navigator.mozL10n, 'get');
  });

  teardown(function() {
    container.remove();
    this.sinon.restore();
  });

  test('It has sensible default max min date ranges when not provided', function() {
    var el = create();
    assert.equal(el.max.getFullYear(), 2099);
    assert.equal(el.min.getFullYear(), 1900);
  });

  test('It should order the parts by the current dateTimeFormat', function() {

    // US Format (%m/%d/%Y)
    navigator.mozL10n.get
      .withArgs('dateTimeFormat_%x')
      .returns('%m/%d/%Y');

    var el = create();

    assert.equal(getComputedStyle(el.els.pickers.month).order, 0);
    assert.equal(getComputedStyle(el.els.pickers.day).order, 1);
    assert.equal(getComputedStyle(el.els.pickers.year).order, 2);

    // UK Format (%d/%m/%Y)
    navigator.mozL10n.get
      .withArgs('dateTimeFormat_%x')
      .returns('%d/%m/%Y');

    el = create();

    assert.equal(getComputedStyle(el.els.pickers.day).order, 0);
    assert.equal(getComputedStyle(el.els.pickers.month).order, 1);
    assert.equal(getComputedStyle(el.els.pickers.year).order, 2);

    // Undefined (%m/%d/%Y)
    delete navigator.mozL10n;

    el = create();

    assert.equal(getComputedStyle(el.els.pickers.month).order, 0);
    assert.equal(getComputedStyle(el.els.pickers.day).order, 1);
    assert.equal(getComputedStyle(el.els.pickers.year).order, 2);
  });

  test('It should clamp given value to max/min date', function() {
    var el = create('', '2014-10-20', '2010-10-20');
    var max = new Date('2014', '09', '20').getTime();
    var min = new Date('2010', '09', '20').getTime();

    el.value = '2014-10-21';
    assert.equal(el.value.getTime(), max, 'was clamped to max');

    el.value = '2009-10-20';
    assert.equal(el.value.getTime(), min, 'was clamped to min');
  });

  test('It accepts a String or Date as a value', function() {
    var el = create();
    var value = new Date('2013', '04', '01');

    el.value = value;
    assert.equal(el.value.getTime(), value.getTime());

    el.value = '2013-05-01';
    assert.equal(el.value.getTime(), value.getTime());
  });

  test.only('It only shows months in the given range', function() {
    var el = create('', '2014-07-01', '2014-05-01');
    var months = el.els.pickers.month.children;
    assert.equal(months.length, 3);
  });

  suite('GaiaPickerDate#setYear()', function() {
    // test('It ')
  });

  function create(value, max, min) {
    value = value ? 'value=' + value : '';
    max = max ? 'max=' + max : '';
    min = min ? 'min=' + min : '';

    container.innerHTML = `
      <gaia-picker-date
        ${value}
        ${max}
        ${min}>
      </gaia-picker-date>`;

    return container.firstElementChild;
  }
});