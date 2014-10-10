;(function(define){'use strict';define(function(require,exports,module){
/*jshint esnext:true*/
/*shint node:true*/

/**
 * Dependencies
 */

var Scroll = require('snap-scroll');

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
    inner: this.shadowRoot.querySelector('.gaia-picker-inner'),
    list: this.shadowRoot.querySelector('.list'),
    items: this.querySelectorAll('li')
  };

  this.shadowStyleHack();

  this.scroll = new Scroll({
    el: this.els.list,
    snap: true,
    itemHeight: 50
  });

  addEventListener('load', function() {
    this.select(0);
  }.bind(this));

  this.els.list.addEventListener('scrolling', this.onScrolling.bind(this));
  this.els.list.addEventListener('snapping', this.onSnapped.bind(this));
  this.els.list.addEventListener('snapped', this.onSnapped.bind(this));
  this.els.list.addEventListener('tap', this.onListTap.bind(this));
};

proto.shadowStyleHack = function() {
  if (hasShadowCSS) { return; }
  var style = this.shadowRoot.querySelector('style').cloneNode(true);
  this.classList.add('-content', '-host');
  style.setAttribute('scoped', '');
  this.appendChild(style);
  this._style = style;
};

proto.onListTap = function(e) {
  var item = this.getChild(e.detail.target);
  this.select(item);
};

proto.onScrolling = function(e) {
  this.clear();
};

proto.onSnapped = function(e) {
  this.select(e.detail.index);
};

proto.select = function(param) {
  var el = typeof param === 'number' ? this.children[param] : param;
  if (!el) { return; }
  this.clear();
  el.classList.add('selected');
  this.scroll.scrollToElement(el, { silent: true });
  this.dispatch('change');
  this.selected = el;
};

proto.clear = function() {
  if (!this.selected) return;
  this.selected.classList.remove('selected');
  this.selected = null;
};

proto.value = function() {
  return this.selected.textContent;
}

proto.dispatch = function(name, detail) {
  this.dispatchEvent(new CustomEvent(name, { detail: detail || {} }))
}

proto.fill = function(list) {
  this._style.remove();

  list.forEach(function(item) {
    var el = document.createElement('li');
    el.textContent = item;
    this.appendChild(el);
  }, this);

  this.appendChild(this._style);
};

proto.getChild = function(el) {
  return el && (el.parentNode === this ? el : this.getChild(el.parentNode));
}

var template = `
<style>

:host {
  display: flex;
  position: relative;
  box-shadow: inset 1px 1px 2px rgba(0,0,0,0.2);
  overflow: hidden;
  -moz-user-select: none;
}

:host:after {
  content: '';
  display: block;
  position: absolute;
  top: 50%; left: 0;
  z-index: -1;
  width: 100%;
  height: 50px;
  margin-top: -25px;
  background: var(--background-plus);
}

.gaia-picker-inner {

}

/** List
 ---------------------------------------------------------*/

.list {
  position: absolute;
  top: 50%; left: 0;
  width: 100%;
  margin-top: -25px;
  padding-bottom: 350px;
}

/** List Items
 ---------------------------------------------------------*/

::content li {
  position: relative;
  height: 50px;
  padding: 0 16px;
  font-size: 18px;
  font-weight: normal;
  line-height: 50px;
  text-align: center;
  list-style-type: none;
  transition: transform 140ms linear;
  cursor: pointer;
}

/**
 * .selected
 */

::content li.selected {
  color: var(--highlight-color);
  transform: scale(1.5);
}

</style>

<div class="gaia-picker-inner">
  <div class="list"><content></content></div>
</div>`;

// If the browser doesn't support shadow-css
// selectors yet, we update the template
// to use the shim classes instead.
if (!hasShadowCSS) {
  template = template
    .replace('::content', 'gaia-picker.-content', 'g')
    .replace(':host', 'gaia-picker.-host', 'g');
}

// Register and return the constructor
// and expose `protoype` (bug 1048339)
module.exports = document.registerElement('gaia-picker', { prototype: proto });
module.exports.proto = proto;

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-picker',this));
