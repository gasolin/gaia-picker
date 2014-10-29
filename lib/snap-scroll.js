;(function(define){'use strict';define(function(require,exports,module){
/*jshint laxbreak:true*/
/*jshint esnext:true*/
/*jshint boss:true*/
/*shint node:true*/

var DEBUG = false;

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

/**
 * Exports
 */

module.exports = Scroll;

/**
 * Initialize a new `Scroll`
 *
 * Config:
 *
 *   - {Element} `list` - The container that should be transformed
 *   - {Boolean} `snap` (optional) - Make the list snap to items
 *   - {Boolean} `circular` (optional) - Make the list loop
 *   - {NodeList} `items` (optional) - The list items to snap to
 *   - {Element} `container` (optional) - The *real* light-dom items parent node.
 *
 * @param {Object} config
 */
function Scroll(config) {
  debug('initialize');
  this.config = config;
  this.els = config.els;
  this.scrollHeight = null;
  this.speedPoints = [];
  this.scrollTop = 0;
  this.previous = {};

  // Test hooks
  this.raf = config.raf || requestAnimationFrame.bind(window);
  this.caf = config.caf || cancelAnimationFrame.bind(window);

  this.heights = config.heights || {};
  this.frames = {};

  this.els = {
    list: config.list,
    container: config.container || config.list
  };

  // Bind context
  this.onPointerDown = this.onPointerDown.bind(this);
  this.onPointerMove = this.onPointerMove.bind(this);
  this.onPointerUp = this.onPointerUp.bind(this);

  this.setup();
}

/**
 * Initial setup.
 *
 * @private
 */
Scroll.prototype.setup = function() {
  this.els.list.addEventListener(pointer.down, this.onPointerDown);
  this.els.list.style.willChange = 'transform';
  if (this.config.circular) { this.setupCircular(); }
  debug('setup');
};

/**
 * Restore the DOM back to how it
 * was before initialization.
 *
 * @private
 */
Scroll.prototype.teardown = function() {
  this.els.list.removeEventListener(pointer.down, this.onPointerDown);
  this.els.list.style.willChange = '';
  this.teardownCircular();
};

/**
 * Setup the list for circular scroll effect.
 *
 * To achieve the illusion of an endless list
 * we create two extra lists clones that sit
 * above and below the original list.
 *
 * @public
 */
Scroll.prototype.setupCircular = function() {
  debug('setup circular');

  // Teardown old circular setup
  if (this.circularSetup) { this.teardownCircular(); }

  this.els.above = document.createElement('div');

  [].forEach.call(this.getItems(), function(item) {
    this.els.above.appendChild(item.cloneNode(true));
  }, this);

  this.els.above.style.transform = 'translateY(-100%)';
  this.els.above.style.position = 'absolute';
  this.els.above.style.width = '100%';
  this.els.above.style.left = 0;
  this.els.above.style.top = 0;

  this.els.below = this.els.above.cloneNode(true);
  this.els.below.style.transform = 'translateY(100%)';

  this.els.container.style.position = 'relative';
  this.els.container.appendChild(this.els.above);
  this.els.container.appendChild(this.els.below);
  this.config.circular = true;
  this.circularSetup = true;
  debug('circular setup');
};

/**
 * Teardown the state required to create
 * the circular illusion.
 *
 * @public
 */
Scroll.prototype.teardownCircular = function() {
  if (!this.circularSetup) { return; }
  this.els.above.remove();
  this.els.below.remove();
  this.els.container.style.position = '';
  this.els.above = null;
  this.els.below = null;
  this.circularSetup = false;
  debug('tore down circular');
};

/**
 * Get the measurements required to
 * perform scrolling.
 *
 * @private
 */
Scroll.prototype.measure = function() {
  this.heights.item = this.heights.item || this.getItems()[0].clientHeight;
  this.heights.container = this.heights.container || this.els.list.parentNode.clientHeight;
  this.heights.list = this.heights.list || this.els.list.clientHeight;
  this.scrollHeight = Math.max(this.heights.list - this.heights.container, 0);
  this.measured = true;
  debug('measured listHeight: %s, scrollHeight: %s',
    this.heights.list, this.scrollHeight, this.heights.container);
};

/**
 * Called when a pointer in down.
 *
 * At this point we late-bind the other
 * event listener reuqired to track the
 * movement and end of the event.
 *
 * We need to run `.pan()` to stop any
 * animation that might be in progress.
 *
 * @param  {TouchEvent|MouseEvent} e
 * @private
 */
Scroll.prototype.onPointerDown = function(e) {
  debug('pointer down');
  e.stopPropagation();
  e.preventDefault();
  this.e = this.point = null;
  this.start = e;
  this.updatePoint(e);
  this.addListeners();
  this.measure();
  this.pan({ silent: true });
};

/**
 * Add event listeners to `window` that are
 * only required when the pointer is down.
 *
 * @private
 */
Scroll.prototype.addListeners = function() {
  addEventListener(pointer.move, this.onPointerMove);
  addEventListener(pointer.up, this.onPointerUp);
  debug('listeners added');
};

/**
 * Remove event listeners from `window` that are
 * only required when the pointer is down.
 *
 * @private
 */
Scroll.prototype.removeListeners = function() {
  removeEventListener(pointer.move, this.onPointerMove);
  removeEventListener(pointer.up, this.onPointerUp);
  debug('listeners removed');
};

/**
 * Called when the pointer moves.
 *
 * Pans the list to stick to the
 * moving pointer.
 *
 * @param  {TouchEvent|MouseEvent} e
 * @private
 */
Scroll.prototype.onPointerMove = function(e) {
  e.stopPropagation();
  e.preventDefault();
  this.updatePoint(e);
  this.pan();
};

/**
 * Called when the pointer is released.
 *
 * Using the speed and an arbitrary time
 * constant we calculate a delta distance
 * to move the scroller.
 *
 * We run the tapHandler to check if this
 * touch event was quick enough to be
 * classified as a tap.
 *
 * Speed points are cleared ready for
 * the next interaction.
 *
 * @param  {TouchEvent|MouseEvent} e
 * @private
 */
Scroll.prototype.onPointerUp = function(e) {
  debug('pointer up');

  var timeConstant = 200;
  var delta = this.getSpeed() * timeConstant;

  e.preventDefault();
  e.stopPropagation();
  this.scrollTo(delta);
  this.removeListeners();
  this.tapHandler(e);
  this.start = null;
  this.speedPoints = [];
};

/**
 * Triggers a 'tap' event if the touch
 * interaction was below the threshold.
 *
 * We do this because 'click's are tricky
 * to deal with. Perhaps there is a better
 * way...meh!
 *
 * @param  {Event} e
 */
Scroll.prototype.tapHandler = function(e) {
  var threshold = 180;
  var tapped = (e.timeStamp - this.start.timeStamp) < threshold;

  if (tapped) {
    debug('tapped');
    this.dispatch('tap', { target: e.target });
  }
};

/**
 * Updates the reference to the last
 * known mouse/touch point.
 *
 * Adds a 'speed point', used to calculate
 * the speed when the pointer is released.
 *
 * @param  {TouchEvent|MouseEvent} e [description]
 * @private
 */
Scroll.prototype.updatePoint = function(e) {
  var point = e.touches ? e.touches[0] : e;

  this.previous.point = this.point || point;
  this.previous.e = this.e || e;
  this.point = point;
  this.e = e;

  this.addSpeedPoint({
    timeStamp: e.timeStamp,
    pageY: point.pageY
  });
};

/**
 * Add a speed point the list.
 *
 * Used when the pointer is released to
 * calculate the speed. The list is
 * limited to `n` points.
 *
 * @param {Object} point  { timeStamp, pageY }
 */
Scroll.prototype.addSpeedPoint = function(point) {
  if (this.speedPoints.length === 6) { this.speedPoints.shift(); }
  this.speedPoints.push(point);
};

/**
 * Calculates the mean speed from the
 * points stored in the `speedPoints`
 * list.
 *
 * The returned number is either positive
 * or negative depending on the direction
 * the points moved in.
 *
 * @return {Number}
 */
Scroll.prototype.getSpeed = function() {
  var data = { distance: 0, time: 0 };

  this.speedPoints.reduce(function(previous, item) {
    if (previous) {
      data.time += (item.timeStamp - previous.timeStamp);
      data.distance += (previous.pageY - item.pageY);
    }

    return item;
  });

  debug('distance: %s, time: %s', data.distance, data.time);
  return data.distance / data.time;
};

/**
 * Pan the list to the current point.
 *
 * Will fire a 'panning' event if the
 * `silent` option isn't used.
 *
 * COMPLEX: We calculate the delta from
 * the last *panned* point, otherwise
 * drawn frames get out of sync with with
 * actual finger position.
 *
 * Option:
 *
 *   - {Boolean} `silent`
 *
 * @param  {Object} options
 * @private
 */
Scroll.prototype.pan = function(options) {
  debug('pan');

  var silent = options && options.silent;
  var self = this;

  // Cancel any scrollTo animation
  // frames that *may* be scheduled
  this.cancelAnimate();

  // Only one frame scheduled at a time
  if (this.frames.pan) { return; }

  // Schedule frame to draw scroll position
  this.frames.pan = this.raf(function() {
    var previous = self.previous.pan || self.previous.point;
    var delta = previous.pageY - self.point.pageY;
    var scrollTop = self.scrollTop + delta;
    var changed = self.setScroll(scrollTop);
    if (!silent && changed) { self.dispatch('panning'); }
    self.previous.pan = self.point;
    self.frames.pan = null;
    debug('panned: %s', scrollTop, changed);
  });
};

/**
 * Cancel any pending `.pan()` frames.
 *
 * @private
 */
Scroll.prototype.cancelPan = function() {
  this.caf(this.frames.pan);
  this.previous.pan = null;
  this.frames.pan = null;
};

/**
 * Set the scroll position.
 *
 * We clamp the given value to ensure it
 * doesn't exceed the max/min scroll positions.
 *
 * If the list is 'circular' is requires some
 * special correction logic to create the
 * illustion of an endless list.
 *
 * @param {Number} scrollTop
 * @return {Boolean} changed - States if the scroll position changed
 */
Scroll.prototype.setScroll = function(scrollTop) {
  if (!this.measured) { this.measure(); }

  var clamped = this.clamp(scrollTop);
  var changed = clamped !== this.scrollTop;

  // Only do something if the end
  // scrollTop actually changed
  if (changed) {
    clamped = this.circularCorrection(clamped);
    this.els.list.style.transform = 'translateY(' + (-clamped) + 'px)';
    debug('changed', clamped, this.els.list.style.transform);
    this.scrollTop = clamped;
  }

  return changed;
};

/**
 * Clamp the given `scrollTop` value
 * between the max/min scroll bounds.
 *
 * If the list is 'circular' it is allowed
 * to overflow the normal scroll bounds.
 *
 * @param  {Number} scrollTop
 * @return {Number}
 * @private
 */
Scroll.prototype.clamp = function(scrollTop) {
  return !this.config.circular
    ? Math.min(Math.max(0,  scrollTop), this.scrollHeight)
    : scrollTop;
};

/**
 * Corrects a given scrollTop value when
 * it has overflowed above or below the
 * height of the list.
 *
 * @param  {Number} scrollTop
 * @return {Number}
 * @private
 */
Scroll.prototype.circularCorrection = function(scrollTop) {
  if (!this.config.circular) { return scrollTop; }
  if (scrollTop < 0) { scrollTop += this.heights.list; }
  else if (scrollTop >= this.heights.list) { scrollTop -= this.heights.list; }
  return scrollTop;
};

Scroll.prototype.refresh = function() {
  if (this.config.circular) { this.setupCircular(); }
  else { this.teardownCircular(); }
  this.setScroll(this.scrollTop);
};

/**
 * Dispatch a DOM event on the
 * list element.
 *
 * @param  {String} name
 * @param  {Object} detail
 * @private
 */
Scroll.prototype.dispatch = function(name, detail) {
  this.els.container.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
};

/**
 * Calculate an end scrollTop given a delta.
 *
 * If the list is 'snapping' then the scrollTop
 * is rounded to the nearest list item.
 *
 * @param  {Number} delta
 * @return {number}
 * @private
 */
Scroll.prototype.getEndPoint = function(delta) {
  var itemHeight = this.heights.item;
  var end = this.scrollTop + delta;

  this.measure();

  end = this.clamp(end);

  if (this.config.snap) {
    end = itemHeight * Math.round(end / itemHeight);
  }

  return end;
};

/**
 * Scroll by a given delta.
 *
 * TODO: This should really take scrollTop
 * as a value, delta is an internal detail.
 *
 * Options:
 *
 *   - {Boolean} `animate`
 *   - {Boolean} `silent`
 *
 * @param  {Number} delta
 * @param  {Object} options
 * @public
 */
Scroll.prototype.scrollTo = function(delta, options) {
  debug('scroll to: %s', delta, options);
  options = options || {};

  // Cancel pending frames
  this.cancelAnimate();
  this.cancelPan();

  var animate = options && options.animate !== false;
  var to = this.getEndPoint(delta, options);
  var type = animate ? 'animate' : 'jump';

  this[type](to, options);
  debug('%s to: %s', this.scrollTop, to);
};

/**
 * Jump to a given scrollTop.
 *
 * If it's a snapping list a 'snapped'
 * event is dispatched with the index
 * of the item snapped to.
 *
 * Options:
 *
 *   - {Boolean} `silent`
 *
 * @param  {Number} to
 * @param  {Object} options
 * @private
 */
Scroll.prototype.jump = function(to, options) {
  debug('jump to: %s', to);

  var silent = options && options.silent;
  var shouldSnap = this.config.snap;

  this.setScroll(to, options);

  if (shouldSnap && !silent) {
    var index = this.scrollTop / this.heights.item;
    this.dispatch('snapped', { index: index });
  }
};

/**
 * Animates to a given scrollTop.
 *
 * If it's a snapping list a 'snapped'
 * event is dispatched when the animation
 * completes with the index of the item
 * snapped to.
 *
 * Options:
 *
 *   - {Boolean} `silent`
 *
 * @param  {Number} to
 * @param  {Object} options
 * @private
 */
Scroll.prototype.animate = function(to, options) {
  debug('animate to: %s', to);

  var timeConstant = (options && options.time) || 16;
  var silent = options && options.silent;
  var remaining = this.scrollTop - to;
  var shouldSnap = this.config.snap;
  var self = this;

  if (!remaining) { return onComplete(); }
  if (!silent) { this.dispatch('scrolling'); }

  // Kick it off...
  this.frames.animate = this.raf(loop);

  function loop() {
    var delta = remaining / timeConstant;
    var remaining_abs = Math.abs(remaining);
    var shouldSpeedUp = shouldSnap && remaining_abs < 30;
    var scrollTop = self.scrollTop - delta;

    // Speed up when close to end destination
    if (shouldSpeedUp) { timeConstant *= 0.8; }

    // Do the draw
    self.setScroll(scrollTop);
    remaining -= delta;

    if (remaining_abs > 0.25) {
      self.frames.animate = self.raf(loop);
      return;
    }

    // One last draw snapped to exact pixel
    self.setScroll(Math.round(scrollTop));
    onComplete();
  }

  function onComplete() {
    if (shouldSnap && !silent) {
      var index = self.scrollTop / self.heights.item;
      self.dispatch('snapped', { index: index });
    }
  }
};

/**
 * Cancel a pending `.animate()` frame.
 *
 * @private
 */
Scroll.prototype.cancelAnimate = function() {
  this.caf(this.frames.animate);
  this.frames.animate = null;
};

/**
 * Get the child nodes of the list.
 *
 * @return {NodeList}
 * @private
 */
Scroll.prototype.getItems = function() {
  return this.els.container.children;
};

/**
 * Scroll the list to a given index
 *
 * NOTE: Snappable lists only.
 *
 * Options:
 *
 *   - {Boolean} `animate`
 *   - {Boolean} `silent`
 *
 * @param  {Number} index
 * @param  {Object} options
 * @public
 */
Scroll.prototype.scrollToIndex = function(index, options) {
  debug('scroll to index: %s', index);
  var delta = this.getClosestIndex(index) * this.heights.item;
  options = options || {};
  options.time = 0.06 * Math.abs(delta);
  this.scrollTo(delta, options);
};

/**
 * Gets the closest delta index
 * to the given index.
 *
 * For circular lists we have the option
 * to scroll into the above or below list
 * when scrolling to an index.
 *
 * This method works out which index
 * (back, internal or forward) is the
 * closest.
 *
 * @param  {Number} index
 * @return {Number} a delta index
 * @private
 */
Scroll.prototype.getClosestIndex = function(index) {
  var length = this.getItems().length;
  var currentIndex = this.scrollTop / this.heights.item;
  var deltaInternal = index - currentIndex;

  if (!this.config.circular) { return deltaInternal; }

  var deltaForward = (length - currentIndex) + index;
  var deltaBack = (-currentIndex) - (length - index);
  var deltas = [deltaForward, deltaBack, deltaInternal];

  return smallestDelta(deltas);
};

/**
 * Returns the smallest delta in the list.
 * @param  {Array} list
 * @return {Number}
 */
function smallestDelta(list) {
  return list.reduce(function(smallest, current) {
    return Math.abs(current) < Math.abs(smallest) ? current : smallest;
  }, list[0]);
}

var debug;
module.exports.debug = function(enabled) {
  debug = enabled ? function() {
    arguments[0] = '[snap-scroll]  ' + arguments[0];
    console.log.apply(console, arguments);
  } : function(){};
};

module.exports.debug(DEBUG);

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('snap-scroll',this));