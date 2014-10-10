;(function(define){define(function(require,exports,module){
/*jshint esnext:true*/
/*shint node:true*/

require('gaia-picker');

/**
 * Detects presence of shadow-dom
 * CSS selectors.
 *
 * @return {Boolean}
 */
var hasShadowCSS = (function() {
  try { document.querySelector(':host'); return true; }
  catch (e) { return false; }
})();

/**
 * Element prototype, extends from HTMLElement
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

/**
 * Called when the element is first created.
 *
 * Here we create the shadow-root and
 * inject our template into it.
 *
 * @private
 */
proto.createdCallback = function() {
  this.createShadowRoot().innerHTML = template;

  // Get els
  this.els = {
    inner: this.shadowRoot.querySelector('.inner'),
    pickers: {
      hour: this.shadowRoot.querySelector('.hour'),
      minute: this.shadowRoot.querySelector('.minute'),
      ampm: this.shadowRoot.querySelector('.ampm')
    }
  };

  // Use the navigator property if it's defined
  this.is12hFormat = 'mozHour12' in navigator ? navigator.mozHour12 : true;
  this.shadowStyleHack();
  this.populate();

  addEventListener('load', this.setup.bind(this));
};

proto.setup = function() {
  var now = new Date();
  this.hours = this.getAttribute('hours');
  this.minutes = this.getAttribute('minutes') || now.getMinutes();
};

proto.populate = function() {
  var startHour = this.is12hFormat ? 1 : 0;
  var endHour = this.is12hFormat ? (startHour + 12) : (startHour + 12 * 2);

  this.els.pickers.hour.fill(this.setDisplayedText(startHour, endHour));
  this.els.pickers.minute.fill(this.setDisplayedText(0, 60, function(value) {
    return (value < 10) ? '0' + value : value;
  }));
}

proto.shadowStyleHack = function() {
  if (hasShadowCSS) { return; }
  var style = this.shadowRoot.querySelector('style').cloneNode(true);
  this.classList.add('-content', '-host');
  style.setAttribute('scoped', '');
  this.appendChild(style);
};

proto.setDisplayedText = function(min, max, format) {
  var list = [];
  for (var i = min; i < max; ++i) {
    list.push(format ? format(i) : i);
  }
  return list;
};

proto.attrs = {
  hours: {
    get: function() {
      return this._hours;
    },
    set: function(value) {
      if (!value) { return; }
      value = Number(value);
      this.els.pickers.hour.select(value - 1)
      this._hours = value;
    }
  },

  minutes: {
    get: function() {
      return this._minutes;
    },
    set: function(value) {
      if (!value) { return; }
      value = Number(value);
      this.els.pickers.minute.select(value)
      this._minutes = value;
      console.log(value);
    }
  }
}

Object.defineProperties(proto, proto.attrs);

var template = `
<style>

:host {
  display: block;
  position: relative;
  overflow: hidden;
  -moz-user-select: none;
}

.inner {
  height: 100%;
}

gaia-picker {
  box-sizing: border-box;
  float: left;
  height: 100%;
  width: 33.33%;
  border-right: solid 1px var(--border-color);
}

</style>

<div class="inner">
  <gaia-picker class="hour"></gaia-picker>
  <gaia-picker class="minute"></gaia-picker>
  <gaia-picker class="ampm">
    <li>AM</li>
    <li>PM</li>
  </gaia-picker>
</div>`;

// If the browser doesn't support shadow-css
// selectors yet, we update the template
// to use the shim classes instead.
if (!hasShadowCSS) {
  template = template
    .replace('::content', 'gaia-picker-time.-content', 'g')
    .replace(':host', 'gaia-picker-time.-host', 'g');
}

/**
 * Import HTML5 input[type="time"] string value
 *
 * @param {String} value 23:20:50.52, 17:39:57.
 * @return {Object} { hours: 23, minutes: 20, seconds: 50 }.
 */
// function importTime(value) {
//   var parts: ['hours', 'minutes', 'seconds'];
//   var result = {
//     hours: 0,
//     minutes: 0,
//     seconds: 0
//   };

//   if (typeof(value) !== 'string') {
//     return result;
//   }

//   var parts = value.split(':');
//   var part;
//   var partName;

//   var i = 0;
//   var len = parts.length;

//   for (; i < len; i++) {
//     partName = parts[i];
//     part = parts[i];
//     if (part) {
//       result[partName] = parseInt(part.slice(0, 2), 10) || 0;
//     }
//   }

//   return result;
// }

// Register and return the constructor
// and expose `protoype` (bug 1048339)
module.exports = document.registerElement('gaia-picker-time', { prototype: proto });
module.exports.proto = proto;

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));
