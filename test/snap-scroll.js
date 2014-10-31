/*global window,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true*/

suite('GaiaPicker', function() {
  'use strict';

  /**
   * Dependencies
   */

  var SnapScroll = window['snap-scroll'];
  var raf = requestAnimationFrame;
  var clock;

  setup(function() {
    this.sinon = sinon.sandbox.create();
    this.container = document.createElement('div');
    this.container.innerHTML = `
      <style>
        .list {
          padding: 0;
          height: 200px;
          overflow: hidden;
          box-shadow: inset 0 1px 4px rgba(0,0,0,0.1);
        }

        .list li {
          position: relative;
          list-style-type: none;
          line-height: 40px;
          height: 40px;
          padding: 0 1rem;
        }
      </style>

      <ul class="list">
        <div class="inner"></div>
      </ul>`;

    this.items = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];

    this.outer = this.container.querySelector('.list');
    this.inner = this.container.querySelector('.inner');
    document.body.appendChild(this.container);

    this.raf = sinon.stub();
    this.caf = sinon.stub();

    // Make rAF sync
    this.raf.callsArg(0);

    var items = this.items;
    this.list = new SnapScroll({
      outer: this.outer,
      inner: this.inner,
      length: items.length,
      caf: this.caf,
      raf: this.raf,
      heights: {
        item: 40,
        outer: 200
      },
      render: function(el, index) {
        el.textContent = items[index];
      }
    });

    this.list.refresh();
  });

  teardown(function() {
    SnapScroll.debug(false);
    this.container.remove();
    if (clock) clock.restore();
  });

  suite('basic', function() {
    test('It pans to follow you finger', function() {
      touchEvent(this.inner, 'touchstart', 100, 100);

      touchEvent(window, 'touchmove', 100, 95);
      assert.equal(this.list.scrollTop, 5);

      touchEvent(window, 'touchmove', 100, 90);
      assert.equal(this.list.scrollTop, 10);

      touchEvent(window, 'touchmove', 100, 85);
      assert.equal(this.list.scrollTop, 15);

      touchEvent(window, 'touchmove', 100, 80);
      assert.equal(this.list.scrollTop, 20);
    });

    test('It recognises quick taps (> 180ms)', function() {
      clock = sinon.useFakeTimers();

      var callback = sinon.spy();

      this.outer.addEventListener('tap', callback);

      touchEvent(this.inner, 'touchstart', 100, 100);
      clock.tick(100);
      touchEvent(this.inner, 'touchend', 100, 100);
      sinon.assert.called(callback);
      callback.reset();

      touchEvent(this.inner, 'touchstart', 100, 100);
      clock.tick(140);
      touchEvent(this.inner, 'touchend', 100, 100);
      sinon.assert.called(callback);
      callback.reset();

      touchEvent(this.inner, 'touchstart', 100, 100);
      clock.tick(250);
      touchEvent(this.inner, 'touchend', 100, 100);
      sinon.assert.notCalled(callback);
    });

    test('It doesn\'t scroll past the top of the list', function() {
      touchEvent(this.inner, 'touchstart', 100, 100);
      touchEvent(window, 'touchmove', 100, 95);
      assert.equal(this.list.scrollTop, 5);
      touchEvent(window, 'touchmove', 100, 90);
      assert.equal(this.list.scrollTop, 10);
      touchEvent(window, 'touchmove', 100, 110);
      assert.equal(this.list.scrollTop, 0);
    });

    test('It doesn\'t scroll past the bottom of the list', function() {
      var max = (this.list.length * this.list.heights.item) - this.outer.clientHeight;

      this.list.scrollDelta(max - 40);
      assert.equal(this.list.scrollTop, max - 40);

      touchEvent(this.inner, 'touchstart', 100, 100);
      touchEvent(window, 'touchmove', 100, 90);
      assert.equal(this.list.scrollTop, max - 30);
      touchEvent(window, 'touchmove', 100, 70);
      assert.equal(this.list.scrollTop, max - 10);
      touchEvent(window, 'touchmove', 100, 50);

      assert.equal(this.list.scrollTop, max, 'didn\'t exceed scroll height');
    });
  });

  suite('speed', function() {
    test('It drifts further if movement was faster', function() {
      clock = sinon.useFakeTimers();

      var slow = {
        start: this.list.scrollTop,
        interval: 20
      };

      touchEvent(this.inner, 'touchstart', 100, 100);
      touchEvent(window, 'touchmove', 100, 95);
      clock.tick(slow.interval);
      touchEvent(window, 'touchmove', 100, 90);
      clock.tick(slow.interval);
      touchEvent(window, 'touchmove', 100, 95);
      clock.tick(slow.interval);
      touchEvent(window, 'touchmove', 100, 80);
      clock.tick(slow.interval);
      touchEvent(window, 'touchend', 100, 75);
      clock.tick(slow.interval);

      slow.distance = this.list.scrollTop - slow.start;

      var fast = {
        start: this.list.scrollTop,
        interval: 10
      };

      touchEvent(this.inner, 'touchstart', 100, 100);
      touchEvent(window, 'touchmove', 100, 95);
      clock.tick(fast.interval);
      touchEvent(window, 'touchmove', 100, 90);
      clock.tick(fast.interval);
      touchEvent(window, 'touchmove', 100, 95);
      clock.tick(fast.interval);
      touchEvent(window, 'touchmove', 100, 80);
      clock.tick(fast.interval);
      touchEvent(window, 'touchend', 100, 75);

      fast.distance = this.list.scrollTop - fast.start;

      assert.isTrue(fast.distance > slow.distance, 'the faster swipe travelled further');
    });
  });

  suite('circular', function() {
    setup(function() {
      this.list.config.circular = true;
      this.list.refresh();
    });

    test('It when the scrollTop is < 0 jump to the bottom', function() {
      var scrollHeight = this.list.length * this.list.heights.item;

      touchEvent(this.inner, 'touchstart', 100, 100);

      assert.equal(this.list.scrollTop, 0);

      touchEvent(window, 'touchmove', 100, 95);

      assert.equal(this.list.scrollTop, 5);

      touchEvent(window, 'touchmove', 100, 90);

      assert.equal(this.list.scrollTop, 10);

      touchEvent(window, 'touchmove', 100, 95);
      touchEvent(window, 'touchmove', 100, 100);
      touchEvent(window, 'touchmove', 100, 105);

      assert.equal(this.list.scrollTop, scrollHeight - 5,
        'It jumps to the bottom of the list when it exceeds the scroll bounds');
    });

    test('It jumps to the top when the list scrolls off the top', function() {
      var scrollHeight = this.list.length * this.list.heights.item;
      var start = (this.list.length * this.list.heights.item) - 30;

      // Start at the bottom of the list
      this.list.scrollDelta(start);

      assert.equal(this.list.scrollTop, start);

      touchEvent(this.inner, 'touchstart', 100, 100);
      touchEvent(window, 'touchmove', 100, 80);
      touchEvent(window, 'touchmove', 100, 70);
      touchEvent(window, 'touchmove', 100, 60);

      assert.equal(this.list.scrollTop, 10,
        'It jumps to the top of the list');
    });
  });

  suite('rendering', function() {
    setup(function() {
      var listPos = this.outer.getBoundingClientRect();
      this.topItemContent = function() {
        return document.elementFromPoint(listPos.left + 10, listPos.top + 10).textContent;
      };
    });

    test('The first list item is at the top', function() {
      assert.equal(this.topItemContent(), 'January');
    });

    test('The first item in the list updates as panning', function() {
      clock = sinon.useFakeTimers();
      this.list.config.circular = true;

      var interval = 1000;

      touchEvent(this.inner, 'touchstart', 100, 200);
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 160);
      assert.equal(this.topItemContent(), 'February');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 120);
      assert.equal(this.topItemContent(), 'March');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 80);
      assert.equal(this.topItemContent(), 'April');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 40);
      assert.equal(this.topItemContent(), 'May');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 0);
      assert.equal(this.topItemContent(), 'June');
      clock.tick(interval);
      touchEvent(window, 'touchend', 100, 0);
      clock.tick(interval);

      touchEvent(this.inner, 'touchstart', 100, 200);
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 160);
      assert.equal(this.topItemContent(), 'July');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 120);
      assert.equal(this.topItemContent(), 'August');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 80);
      assert.equal(this.topItemContent(), 'September');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 40);
      assert.equal(this.topItemContent(), 'October');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 0);
      assert.equal(this.topItemContent(), 'November');
      clock.tick(interval);
      touchEvent(window, 'touchend', 100, 0);
      clock.tick(interval);

      touchEvent(this.inner, 'touchstart', 100, 200);
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 160);
      assert.equal(this.topItemContent(), 'December');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 120);
      assert.equal(this.topItemContent(), 'January');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 80);
      assert.equal(this.topItemContent(), 'February');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 40);
      assert.equal(this.topItemContent(), 'March');
      clock.tick(interval);
      touchEvent(window, 'touchmove', 100, 0);
      assert.equal(this.topItemContent(), 'April');
      clock.tick(interval);
      touchEvent(window, 'touchend', 100, 0);
      clock.tick(interval);
    });
  });

  /**
   * Utils
   */

  function touchEvent(element, type, x, y) {
    var touch = document.createTouch(
      window,
      element,
      0,
      x || 0,
      y || 0);

    var touchList = document.createTouchList([touch]);
    var event = document.createEvent('TouchEvent');

    event.initTouchEvent(
      type, // type
      true, // bubbles
      true, // cancelable
      window, // view
      null, // detail
      false, // ctrlKey
      false, // altKey
      false, // shiftKey
      false, // metaKey
      touchList, // touches
      touchList, // targetTouches
      touchList); // changedTouches

    // Set the timestamp to be sure
    Object.defineProperty(event, 'timeStamp', { value: Date.now() });

    element.dispatchEvent(event);
  }
});