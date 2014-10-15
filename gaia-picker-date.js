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
  min: 1900,
  max: 2099
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
  var now = new Date();

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

  this.value = this.getAttribute('value') || new Date();
  this.min = this.getAttribute('min') || defaults.min;
  this.max = this.getAttribute('max') || defaults.max;

  this.setPickerHeights();

  this.refreshYears();
  this.refreshMonths();

  this.setPickerOrder(this.getDateTimeFormat());
  this.addListeners();
};

proto.attributeChangedCallback = function(attr, from, to) {
  if (this.attrs[attr]) { this[attr] = to; }
};

proto.refreshYears = function() {
  var list = createYearList(this.min, this.max);
  var current = this.value.getFullYear();
  var min = this.min.getFullYear();
  var index = current - min;
  this.els.pickers.year.fill(list);
  this.els.pickers.year.select(index);
  debug('refreshed years: %S index: %s', list, index);
};

proto.refreshMonths = function() {
  var list = createMonthList();
  this.els.pickers.month.fill(list);
  this.els.pickers.month.select(this.value.getMonth());
};

proto.refreshDays = function() {
  var picker = this.els.pickers.day;
  var year = this.value.getFullYear();
  var month = this.value.getMonth();
  var list = createDayList(year, month);
  var index = this.value.getDate() - 1;
  var changed = list.length !== picker.length;

  if (!changed) { return; }

  picker.fill(list);
  picker.select(index);
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
  this.setMonth(e.detail.index);
};

proto.onDayChanged = function(e) {
  debug('day changed: %s', e.detail.index);
  var day = e.detail.index + 1;
  this.value.setDate(day);
};

proto.setYear = function(year) {
  var current = this.value.getFullYear();
  if (year === current) { return; }

  var month = this.value.getMonth();
  var days = getDaysInMonth(year, month);

  if (this.value.getDate() > days) {
    this.value.setDate(days);
  }

  this.value.setFullYear(year);
  this.refreshDays();
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
  this.refreshDays();
};

proto.setPickerHeights = function() {
  var height = Number(this.getAttribute('height'));
  if (!height) { return; }
  this.els.pickers.day.height = height;
  this.els.pickers.month.height = height;
  this.els.pickers.year.height = height;
};

proto.setPickerOrder = function(order) {
  order.forEach(function(type, i) {
    this.els.pickers[type].style.order = i;
  }, this);
};

proto.getDateTimeFormat = function() {
  var format = navigator.mozL10n && navigator.mozL10n.get('dateTimeFormat_%x') || '%m/%d/%Y';
  return getDateComponentOrder(format);
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

proto.attrs = {

  value: {
    get: function() { return this._value; },
    set: function(value) {
      if (!value) { return; }
      var date = typeof value === 'string' ? stringToDate(value) : value;
      this._value = date;
    }
  },

  min: {
    get: function() { return this._min; },
    set: function(value) {
      if (!value) { return; }
      var date = typeof value === 'string' ? stringToDate(value) : value;
      this._min = date;
    }
  },

  max: {
    get: function() { return this._max; },
    set: function(value) {
      if (!value) { return; }
      var date = typeof value === 'string' ? stringToDate(value) : value;
      this._max = date;
    }
  },

  days: {
    get: function() { return this._days; },
    set: function(value) {
      debug('set days: %s', value, this.days);
      value = Number(value);
      if (value === this.hours) { return; }
      this._days = value;
    }
  },

  months: {
    get: function() { return this._months; },
    set: function(value) {
      debug('set months: %s', value);
      value = Number(value);
      if (value === this.months) { return; }
      this.els.pickers.months.select(value);
      this._months = value;
    }
  },

  years: {
    get: function() { return this._years; },
    set: function(value) {
      this._years = value;
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

gaia-picker:not(:first-child):after {
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

function createList(min, max, format) {
  var list = [];
  for (var i = min; i < max; ++i) {
    list.push(format ? format(i) : i);
  }
  return list;
}

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

function createMonthList() {
  var date = new Date(1970, 0, 1);
  var list = [];

  for (var i = 0; i < 12; i++) {
    date.setMonth(i);
    list.push(localeFormat(date, '%b'));
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

  debug('days list created: %s', days, list.length);
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

function getDateComponentOrder(format) {
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
