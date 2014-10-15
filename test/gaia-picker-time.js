/*global window,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true*/

suite('GaiaPickerTime', function() {
  'use strict';

  /**
   * Dependencies
   */

  var GaiaPickerTime = window['gaia-picker-time'];

  /**
   * Locals
   */

  var container;

  setup(function() {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  teardown(function() {
    container.remove();
  });

  test('It defaults to the current time', function() {
    var now = new Date();
    var picker = create();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var formattedNow = (hours < 10 ? '0' + hours : hours) + ':' + minutes;
    assert.equal(picker.getTimeValue(), formattedNow);
  });

  test('It returns hours in 24hr format', function() {
    var picker = create(14, 44, '12hr');
    assert.strictEqual(picker.hours, 14);
  });

  test('It returns minutes', function() {
    var picker = create(14, 44);
    assert.strictEqual(picker.minutes, 44);
  });

  test('It uses `navigator.mozHour12` if format attribute is not defined', function() {
    var previous = navigator.mozHour12;

    navigator.mozHour12 = true;
    var picker = create(15, 20);
    assert.equal(picker.format, '12hr');

    navigator.mozHour12 = previous;
  });

  test('It defaults to 24hr format', function() {
    assert.equal(create(15, 20, '24hr').format, '24hr');
  });

  function create(hours, minutes, format) {
    minutes = minutes ? 'minutes=' + minutes : '';
    hours = hours ? 'hours=' + hours : '';
    format = format ? 'format=' + format : '';
    container.innerHTML = `
      <gaia-picker-time
        ${hours}
        ${minutes}
        ${format}>
      </gaia-picker-time>`;

    return container.firstElementChild;
  }
});