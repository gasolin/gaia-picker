;(function(define){define(function(require,exports,module){

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

// Alias
var raf = requestAnimationFrame;
var caf = cancelAnimationFrame;

/**
 * Exports
 */

module.exports = Scroll;

function Scroll(options) {
  this.itemHeight = options.itemHeight;
  this.snap = options.snap;
  this.el = options.el;
  this.scrollTop = 0;
  this.last = {};

  // Bind context
  this.onPointerUpInternal = this.onPointerUpInternal.bind(this);
  this.onPointerDown = this.onPointerDown.bind(this);
  this.onPointerMove = this.onPointerMove.bind(this);
  this.onPointerUp = this.onPointerUp.bind(this);
  this.updateSpeed = this.updateSpeed.bind(this);

  this.el.addEventListener(pointer.down, this.onPointerDown);
}

Scroll.prototype.measure = function() {
  this.containerHeight = this.el.parentNode.clientHeight;
  this.scrollHeight = Math.max(this.el.clientHeight - this.containerHeight, 0);
};

Scroll.prototype.onPointerDown = function(e) {
  this.e = this.point = null;
  this.start = e;
  this.updatePoint(e);
  this.addListeners();
  this.measure();
  this.monitorSpeed = true;
  this.updateSpeed();
  this.pan();
};

Scroll.prototype.updatePoint = function(e) {
  var point = e.touches ? e.touches[0] : e;
  this.last.point = this.point || point;
  this.last.e = this.e || e;
  this.point = point;
  this.e = e;
};

Scroll.prototype.onPointerMove = function(e) {
  this.updatePoint(e);
  caf(this.raf);
  this.pan();
};

Scroll.prototype.onPointerUp = function(e) {
  this.scrollTo({ delta: this.speed * 90 });
  this.monitorSpeed = false;
  this.removeListeners();
};

Scroll.prototype.onPointerUpInternal = function(e) {
  var tapped = (e.timeStamp - this.start.timeStamp) < 150;
  this.start = null;

  if (tapped) {
    e.stopPropagation();
    e.preventDefault();
    this.removeListeners();
    this.dispatch('tap', { target: e.target });
    return;
  }
};

Scroll.prototype.addListeners = function() {
  this.el.addEventListener(pointer.up, this.onPointerUpInternal);
  addEventListener(pointer.move, this.onPointerMove);
  addEventListener(pointer.up, this.onPointerUp);
};

Scroll.prototype.removeListeners = function() {
  this.el.removeEventListener(pointer.up, this.onPointerUpInternal);
  removeEventListener(pointer.move, this.onPointerMove);
  removeEventListener(pointer.up, this.onPointerUp);
};


Scroll.prototype.pan = function() {
  caf(this.raf);

  this.frame = this.frame || raf(function() {
    this.frame = null;
    var delta = this.last.point.clientY - this.point.clientY;
    this.setScroll(this.scrollTop + delta);
    this.draw();
  }.bind(this));

  this.dispatch('scrolling');
};

Scroll.prototype.cancelPan = function() {
  caf(this.frame);
  this.frame = null;
};

Scroll.prototype.setScroll = function(value) {
  this.scrollTop = Math.min(Math.max(0, value), this.scrollHeight);
};

Scroll.prototype.draw = function() {
  this.el.style.transform = 'translateY(' + (-this.scrollTop) + 'px)';
};

Scroll.prototype.dispatch = function(name, detail) {
  setTimeout(function() {
    this.el.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }.bind(this));
};

Scroll.prototype.scrollTo = function(options) {
  this.measure();

  var silent = options && options.silent;
  var timeConstant = options.time || 16;
  var distance = options.delta !== undefined ? options.delta : (options.scrollTop - this.scrollTop);
  var clampedScrollTop = Math.min(Math.max(0, this.scrollTop + distance), this.scrollHeight);
  var snapping = false;
  var self = this;

  this.cancelPan();
  caf(this.raf);

  if (!silent) { this.dispatch('scrolling'); }

  distance = this.scrollTop - clampedScrollTop;

  if (this.snap) {
    var snappedScrollTop = this.itemHeight * Math.round(clampedScrollTop / this.itemHeight);
    distance = this.scrollTop - snappedScrollTop;
    this.index = snappedScrollTop / this.itemHeight;
  }

  this.raf = raf(function loop() {
    var delta = (distance / timeConstant);
    var scrollTop = self.scrollTop - delta;

    // Speed up when close to end destination
    if (self.snap && Math.abs(delta) < 2) {
      timeConstant *= 0.8;
    }

    // Dispatch a 'snapping' event
    // when close to snapping
    if (self.snap && Math.abs(delta) < 0.4) {
      if (!snapping && !silent) {
        self.dispatch('snapping', { index: self.index });
      }
      snapping = true;
    }

    self.setScroll(scrollTop);
    distance -= delta;

    self.draw();

    if (Math.abs(distance) > 0.25) {
      self.raf = raf(loop);
    } else if (self.snap && !silent) {
      self.dispatch('snapped', { index: self.index });
    }
  });
};

Scroll.prototype.updateSpeed = function() {
  if (!this.point) return;

  var last = this.last.speedCheck || 0;
  var distance =  last - this.point.clientY;
  var time = this.e.timeStamp - this.last.e.timeStamp;
  var speed = distance / time;
  var self = this;

  // Limit speed
  speed = Math.max(-7, Math.min(7, speed));

  this.last.speed = this.speed || 0;
  this.last.speedCheck = this.point.clientY;
  this.speed = speed;

  if (this.monitorSpeed) {
    raf(function() {
      raf(self.updateSpeed);
    });
  }
};

Scroll.prototype.scrollToElement = function(el, options) {
  options = options || {};
  options.scrollTop = el.offsetTop;
  options.time = 4;
  this.scrollTo(options);
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('snap-scroll',this));