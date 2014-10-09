;(function(define){'use strict';define(function(require,exports,module){
/*jshint esnext:true*/
/*shint node:true*/

/**
 * Dependencies
 */

var scroll = require('snap-scroll');

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
    list: this.shadowRoot.querySelector('.list')
  };

  this.shadowStyleHack();

  this.scroll = new Scroll({
    el: this.els.list,
    snap: true,
    itemHeight: this.children[0].clientHeight
  });

  this.els.list.addEventListener('tap', this.onListTap.bind(this));
};

proto.shadowStyleHack = function() {
  if (hasShadowCSS) { return; }
  var style = this.shadowRoot.querySelector('style').cloneNode(true);
  this.classList.add('-content', '-host');
  style.setAttribute('scoped', '');
  this.appendChild(style);
};

proto.onListTap = function(e) {
  console.log(e.detail.target);

  var item = this.getChild(e.detail.target);
  this.scroll.scrollToElement(item);
};

proto.getChild = function(el) {
  return el && (el.parentNode === this ? el : this.getChild(el.parentNode));
}

var template = `
<style>

:host {
  display: block;
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

.inner {
  height: 100%;
  // margin-top: -25px;
}

/** List
 ---------------------------------------------------------*/

.list {
  position: absolute;
  top: 50%; left: 0;
  width: 100%;
  margin-top: -25px;
  padding-bottom: 150px;
  // background: red;
}

/** List Items
 ---------------------------------------------------------*/

::content li {
  position: relative;
  height: 50px;
  padding: 0 16px;
  font-size: 18px;
  line-height: 50px;
}

::content li:after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%;
  height: 1px;
  background: var(--border-color);
}

</style>

<div class="inner">
  <div class="list"><content></content></div>
</div>`;

// If the browser doesn't support shadow-css
// selectors yet, we update the template
// to use the shim classes instead.
if (!hasShadowCSS) {
  template = template
    .replace('::content', '.-content', 'g')
    .replace(':host', '.-host', 'g');
}

/**
 * Pointer event abstraction to make
 * it work for touch and mouse.
 *
 * @type {Object}
 */
var pointer = [
  { down: 'touchstart', up: 'touchend', move: 'touchmove' },
  { down: 'mousedown', up: 'mouseup', move: 'mousemove' }
]['ontouchstart' in window ? 0 : 1];


var raf = requestAnimationFrame;
var caf = cancelAnimationFrame;

function Scroll(options) {
  this.snap = options.snap;
  this.el = options.el;
  this.containerHeight = this.el.parentNode.clientHeight;
  this.scrollHeight = this.el.clientHeight - this.containerHeight;
  this.itemHeight = options.itemHeight;
  this.scrollTop = 0;
  this.last = {};

  // Bind context
  this.onPointerDown = this.onPointerDown.bind(this);
  this.onPointerMove = this.onPointerMove.bind(this);
  this.onPointerUp = this.onPointerUp.bind(this);
  this.updateSpeed = this.updateSpeed.bind(this);

  this.el.addEventListener(pointer.down, this.onPointerDown);
}

Scroll.prototype.onPointerDown = function(e) {
  this.e = this.point = null
  this.updatePoint(e);

  this.start = e;
  this.monitorSpeed = true;
  this.updateSpeed();

  addEventListener(pointer.move, this.onPointerMove);
  addEventListener(pointer.up, this.onPointerUp);
}

Scroll.prototype.updatePoint = function(e) {
  var point = e.touches ? e.touches[0] : e;
  this.last.point = this.point || point;
  this.last.e = this.e || e;
  this.point = point;
  this.e = e;
}

Scroll.prototype.onPointerMove = function(e) {
  caf(this.raf);

  var self = this;
  this.updatePoint(e);
  if (this.frame) { return; }

  this.frame = raf(function() {
    self.frame = null;
    self.pan();
  });
}

Scroll.prototype.onPointerUp = function(e) {
  this.monitorSpeed = false;


  var tapped = (e.timeStamp - this.start.timeStamp) < 180;

  if (tapped) {
    setTimeout(function() {
      this.el.dispatchEvent(new CustomEvent('tap', {
        detail: { target: e.target }
      }));
    }.bind(this));
  }


  this.scrollTo({
    delta: this.speed * 100,
  }, this.snapToClosest.bind(this));

  this.start = null;

  removeEventListener(pointer.up, this.onPointerUp);
  removeEventListener(pointer.move, this.onPointerMove);
}

Scroll.prototype.pan = function() {
  caf(this.raf);

  var delta = this.last.point.clientY - this.point.clientY;
  this.setScroll(this.scrollTop - delta);
  this.draw();
};

Scroll.prototype.setScroll = function(value) {
  var clamped = Math.max(Math.min(0, value), -this.scrollHeight);
  this.scrollTop = clamped;
  return clamped !== value;
};

Scroll.prototype.draw = function() {
  this.el.style.transform = 'translateY(' + this.scrollTop + 'px)';
}

Scroll.prototype.scrollTo = function(options, done) {
  caf(this.raf);

  var timeConstant = options.time || 16;
  var distance = options.delta !== undefined ? options.delta : (this.scrollTop - options.scrollTop);
  var self = this;

  this.raf = raf(function loop() {
    var delta = distance / timeConstant;
    var clamped = self.setScroll(self.scrollTop - delta)
    distance -= delta;
    self.draw();

    if (!clamped && Math.abs(delta) > 0.18) {
      self.raf = raf(loop);
    } else if (done) {
      done();
    }
  });
}

Scroll.prototype.updateSpeed = function() {
  if (!this.point) return;

  var last = this.last.speedCheck || 0;
  var distance =  last - this.point.clientY;
  var time = this.e.timeStamp - this.last.e.timeStamp;
  var speed = time > 2 ? distance / time : 0;

  this.last.speed = this.speed || 0;
  this.last.speedCheck = this.point.clientY;
  this.speed = speed;

  if (this.monitorSpeed) {
    setTimeout(this.updateSpeed, 50);
  }
}

Scroll.prototype.scrollToElement = function(el) {
  this.scrollTo({ scrollTop: -el.offsetTop, time: 10 });
};

Scroll.prototype.snapToClosest = function() {
  var offset = this.scrollTop % this.itemHeight;
  var items = this.scrollTop / this.itemHeight;
  var snappedOffset = this.itemHeight * Math.round(this.scrollTop / this.itemHeight);
  this.scrollTo({ scrollTop: snappedOffset, time: 5 });
}

Scroll.prototype.snap = function(y) {

}


function getDistance(a, b) {
  var xs = 0;
  var ys = 0;

  xs = b.clientX - a.clientX;
  xs = xs * xs;

  ys = b.clientY - a.clientY;
  ys = ys * ys;

  return Math.sqrt(xs + ys);
}

// Register and return the constructor
// and expose `protoype` (bug 1048339)
module.exports = document.registerElement('gaia-picker', { prototype: proto });
module.exports.proto = proto;

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));
