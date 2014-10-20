;(function(define,n){'use strict';define(function(require,exports,module){
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
 * Simple debug logger
 *
 * @param  {String} value
 */
var debug = !~location.search.indexOf(n) ? function() {} : function() {
  arguments[0] = `[${n}]  ` + arguments[0];
  console.log.apply(console, arguments);
};

/**
 * Element prototype, extends from HTMLElement
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);


var defaults = {
  min: new Date('1900', '0', '01'),
  max: new Date('2099', '0', '01')
};

/**
 * Called when the element is first created.
 *
 * Here we create the shadow-root and
 * inject our template into it.
 *
 * @private
 */
proto.createdCallback = function() {
  this.createShadowRoot();
  this.shadowRoot.host = this; // Remove once .host is in platform
  this.shadowRoot.innerHTML = template;
  this.shadowStyleHack();

  // Get els
  this.els = {
    inner: this.shadowRoot.querySelector('.inner'),
    pickers: {
      day: this.shadowRoot.querySelector('.days'),
      month: this.shadowRoot.querySelector('.months'),
      year: this.shadowRoot.querySelector('.years')
    }
  };

  // This currently not working
  this.setPickerHeights();

  this.min = this.getAttribute('min') || defaults.min;
  this.max = this.getAttribute('max') || defaults.max;
  this.value = this.getAttribute('value') || new Date();

  this.updatePickers();

  setTimeout(this.addListeners.bind(this));
  this.updatePickerOrder();

  this.created = true;
};

proto.attributeChangedCallback = function(attr, from, to) {
  if (this.attrs[attr]) { this[attr] = to; }
};

proto.addListeners = function() {
  var pickers = this.els.pickers;
  on(pickers.year, 'changed', this.onYearChanged, this);
  on(pickers.month, 'changed', this.onMonthChanged, this);
  on(pickers.day, 'changed', this.onDayChanged, this);
};

proto.onYearChanged = function(e) {
  debug('year changed: %s', e.detail.value);
  this.setYear(e.detail.value);
};

proto.onMonthChanged = function(e) {
  debug('month changed: %s', e.detail.index);
  var index = e.detail.index;
  var isFirstYear = this.min.getFullYear() === this.value.getFullYear();

  // If we're in the first year, the first
  // month in the list may not be January.
  if (isFirstYear) {
    index = this.min.getMonth() + index;
    debug('index adjusted: %s', index);
  }

  this.setMonth(index);
};

proto.onDayChanged = function(e) {
  debug('day changed: %s', e.detail.index);
  this.setDay(e.detail.index + 1);
};

/**
 * Set the year of the date picker.
 * @param {[type]} year [description]
 */
proto.setYear = function(year) {
  debug('set year: %s', year);
  year = Number(year);

  // Abort if year didn't change
  if (year === this.value.getFullYear()) { return; }

  var month = this.value.getMonth();
  var days = getDaysInMonth(year, month);
  var isMinYear = year === this.min.getFullYear();
  var isMaxYear = year === this.max.getFullYear();

  // Ensure the month doen't exceed the max/min range
  if (isMinYear) { this.value.setMonth(Math.max(this.min.getMonth(), month)); }
  if (isMaxYear) { this.value.setMonth(Math.min(this.max.getMonth(), month)); }

  // When the new month has fewer days
  // days than the current day, we must
  // adjust the day to maximum available.
  if (this.value.getDate() > days) {
    this.value.setDate(days);
    debug('day adjusted: %s', days);
  }

  this.value.setFullYear(year);
  this.updateMonthPicker();
  this.updateDayPicker();
};

proto.setMonth = function(month) {
  debug('set month: %s', month);
  var year = this.value.getFullYear();
  var days = getDaysInMonth(year, month);

  // When the new month has fewer days
  // days than the current day, we must
  // adjust the day to maximum available.
  if (this.value.getDate() > days) {
    this.value.setDate(days);
    debug('day adjusted: %s', days);
  }

  this.value.setMonth(month);
  this.updateDayPicker();
};

proto.setDay = function(day) {
  var changed = this.value.getDate() !== day;
  if (!changed) { return; }
  this.value.setDate(day);
  this.updateDayPickerValue();
};

proto.updatePickers = function() {
  this.updateYearPicker();
  this.updateMonthPicker();
  this.updateDayPicker();
};

/**
 * Refreshes the year list based on
 * the current max/min dates, only
 * if it changed.
 *
 * @private
 */
proto.updateYearPicker = function() {
  debug('update years');
  if (!this.min || !this.max) { return; }

  var picker = this.els.pickers.year;
  var list = createYearList(this.min, this.max);
  var lengthChanged = picker.length !== list.length;
  var firstItem = picker.children[0];

  // If the length of the list is different
  // or the value of the first item is different
  // we can assume the list has changed.
  var changed = lengthChanged || (firstItem && firstItem.textContent !== list[0]);

  if (!changed) { return; }

  this.els.pickers.year.fill(list);
  this.updateYearPickerValue();
  debug('years updated', list);
};

proto.updateMonthPicker = function() {
  debug('update months');
  if (!this.value) { return; }

  var picker = this.els.pickers.month;
  var firstItem = picker.children[0];
  var list = this.createMonthList();

  // If the length of the list is different
  // or the value of the first item is different
  // we can assume the list has changed.
  var changed = picker.length !== list.length ||
    firstItem && firstItem.textContent !== list[0];

  if (!changed) {
    debug('list didn\'t change');
    return;
  }

  picker.fill(list);
  this.updateMonthPickerValue();
  debug('months updated', list);
};

proto.updateDayPicker = function() {
  debug('update days');
  if (!this.value) { return; }
  var picker = this.els.pickers.day;
  var year = this.value.getFullYear();
  var month = this.value.getMonth();
  var list = createDayList(year, month);
  var changed = list.length !== picker.length;
  var day = this.value.getDate();

  if (!changed) { return; }

  picker.fill(list);
  this.updateDayPickerValue(day);
  debug('days updated', list);
};

/**
 * Updates the year picker to match
 * the current year value.
 *
 * This won't do anything if triggered
 * from the 'changed' callback.
 *
 * @private
 */
proto.updateYearPickerValue = function() {
  debug('update years');
  if (!this.value) { return; }
  var min = this.min.getFullYear();
  var index = this.value.getFullYear() - min;
  this.els.pickers.year.select(index);
  debug('year picker index updated: %s', index);
};

/**
 * Updates the month picker to match
 * the current month value.
 *
 * This won't do anything if triggered
 * from the 'changed' callback.
 *
 * @private
 */
proto.updateMonthPickerValue = function() {
  debug('update months');
  if (!this.value) { return; }
  var isMinYear = this.value.getFullYear() === this.min.getFullYear();
  var index = this.value.getMonth();

  // If we're in the minimum year, the first
  // month in the list may not be January.
  if (isMinYear) {
    index = index - this.min.getMonth();
    debug('index altered: %s', index);
  }

  this.els.pickers.month.select(index);
  debug('month picker index updated: %s', index);
};

/**
 * Updates the month picker to match
 * the current month value.
 *
 * This won't do anything if triggered
 * from the 'changed' callback.
 *
 * @private
 */
proto.updateDayPickerValue = function() {
  if (!this.value) { return; }
  var index = this.value.getDate() - 1;
  this.els.pickers.day.select(index);
  debug('day picker index updated: %s', index);
};

/**
 * Specifies if the given Date is
 * in the picker's date range.
 *
 * @param  {Date} date
 * @return {Boolean}
 */
proto.inRange = function(date) {
  var time = date.getTime();
  return time <= this.max.getTime() && time >= this.min.getTime();
};

proto.createMonthList = function() {
  var currentYear = this.value.getFullYear();
  var years = this.max.getFullYear() - this.min.getFullYear();
  var date = new Date(currentYear, 0, 1);
  var list = [];

  for (var i = 0; i < 12; i++) {
    date.setMonth(i);
    if (this.inRange(date)) {
      list.push(localeFormat(date, '%b'));
    }
  }

  return list;
};

proto.setPickerHeights = function() {
  var height = parseInt(this.style.height, 10);
  if (!height) { return; }
  this.els.pickers.day.height = height;
  this.els.pickers.month.height = height;
  this.els.pickers.year.height = height;
  debug('set picker heights: %s', height);
};

proto.updatePickerOrder = function() {
  var order = getDateComponentOrder();
  order.forEach(function(type, i) {
    this.els.pickers[type].style.order = i;
  }, this);
};

/**
 * It's useful to have attributes duplicated
 * on a node inside the shadow-dom so that
 * we can use them for style-hooks.
 *
 * @param {String} name
 * @param {String} value
 * @public
 */
proto.setAttribute = function(name, value) {
  this.els.inner.setAttribute.call(this, name, value);
  this.els.inner.setAttribute(name, value);
};

proto.clampDate = function(date) {
  if (date > this.max) { return new Date(this.max.getTime()); }
  else if (date < this.min) { return new Date(this.min.getTime()); }
  else { return date; }
};

proto.attrs = {
  value: {
    get: function() { return this._value; },
    set: function(value) {
      if (!value) { return; }
      var date = typeof value === 'string' ? stringToDate(value) : value;
      var clamped = this.clampDate(date);
      this._value = clamped;

      // Only update pickers if fully created
      if (this.created) { this.updatePickers(); }
    }
  },

  min: {
    get: function() { return this._min; },
    set: function(value) {
      if (!value) { return; }
      var date = typeof value === 'string' ? stringToDate(value) : value;
      this._min = date;

      // Only update pickers if fully created
      if (this.created) { this.updatePickers(); }
    }
  },

  max: {
    get: function() { return this._max; },
    set: function(value) {
      if (!value) { return; }
      var date = typeof value === 'string' ? stringToDate(value) : value;
      this._max = date;

      // Only update pickers if fully created
      if (this.created) { this.updatePickers(); }
    }
  }
};

Object.defineProperties(proto, proto.attrs);

proto.shadowStyleHack = function() {
  if (hasShadowCSS) { return; }
  var style = this.shadowRoot.querySelector('style').cloneNode(true);
  this.classList.add('-content', '-host');
  style.setAttribute('scoped', '');
  this.appendChild(style);
};

var template = `
<style>

:host {
  display: block;
  position: relative;
  overflow: hidden;
  -moz-user-select: none;
}

.inner {
  display: flex;
  height: 100%;
}

gaia-picker {
  flex: 1;
}

gaia-picker:after {
  content: '';
  position: absolute;
  left: 0; top: 0;
  z-index: -1;
  width: 1px;
  height: 100%;
  background: var(--border-color);
}

</style>

<div class="inner">
  <gaia-picker class="days"></gaia-picker>
  <gaia-picker class="months"></gaia-picker>
  <gaia-picker class="years"></gaia-picker>
</div>`;

// If the browser doesn't support shadow-css
// selectors yet, we update the template
// to use the shim classes instead.
if (!hasShadowCSS) {
  template = template
    .replace('::content', 'gaia-picker-date.-content', 'g')
    .replace(':host', 'gaia-picker-date.-host', 'g');
}

/**
 * Utils
 */

function on(el, name, fn, ctx) {
  el.addEventListener(name, fn.bind(ctx));
}

function getDaysInMonth(year, month) {
  debug('days in month: %s, year: %s', month, year);
  var date = new Date(year, month + 1, 0);
  return date.getDate();
}

// var mozL10nDateFormat = navigator.mozL10n && navigator.mozL10n.DateTimeFormat;
// var localFormat = mozL10nDateFormat ? mozL10nDateFormat().localeFormat : localeFormat;

function localeFormat(date, token) {
  switch (token) {
    case '%b': return strings.months[date.getMonth()];
    case '%A': return strings.days[date.getDay()];
    case '%Y': return date.getFullYear();
    case '%d': return date.getDate();
  }
}

var strings = {
  days: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ],

  months: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ]
};

function createYearList(min, max) {
  var list = [];
  var date;

  for (var i = min.getFullYear(); i <= max.getFullYear(); i++) {
    date = new Date(i, 0, 1);
    list.push(localeFormat(date, '%Y'));
  }

  return list;
}

function createDayList(year, month) {
  var days = getDaysInMonth(year, month);
  var list = [];

  for (var i = 1; i <= days; i++) {
    var date = new Date(year, month, i);
    list.push(localeFormat(date, '%d'));
  }

  return list;
}

/**
 * Convert a string to a `Date` object.
 *
 * @param  {String} string  1970-01-01
 * @return {Date}
 */
function stringToDate(string) {
  if (!string) { return null; }
  var parts = string.split('-');
  var date = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
  if (isNaN(date.getTime())) { date = null; }
  return date;
}

function getDateTimeFormat() {
  return navigator.mozL10n && navigator.mozL10n.get('dateTimeFormat_%x') || '%m/%d/%Y';
}

function getDateComponentOrder() {
  var format = getDateTimeFormat();
  var tokens = format.match(/(%E.|%O.|%.)/g);
  var fallback = ['day', 'month', 'year'];
  var order = [];

  if (tokens) {
    tokens.forEach(function(token) {
      switch (token) {
        case '%Y':
        case '%y':
        case '%Oy':
        case 'Ey':
        case 'EY':
          order.push('year');
          break;
        case '%B':
        case '%b':
        case '%m':
        case '%Om':
          order.push('month');
          break;
        case '%d':
        case '%e':
        case '%Od':
        case '%Oe':
          order.push('day');
          break;
      }
    });
  }

  return order.length === 3 ? order : fallback;
}

// Register and return the constructor
// and expose `protoype` (bug 1048339)
module.exports = document.registerElement('gaia-picker-date', { prototype: proto });
module.exports.proto = proto;

},n);})(typeof define=='function'&&define.amd?define
:(function(w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c,n){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})(this), 'gaia-picker-date');
