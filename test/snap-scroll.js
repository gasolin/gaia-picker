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
        <div class="inner">
          <li>January</li>
          <li>February</li>
          <li>March</li>
          <li>April</li>
          <li>May</li>
          <li>June</li>
          <li>July</li>
          <li>August</li>
          <li>September</li>
          <li>October</li>
          <li>November</li>
          <li>December</li>
        </div>
      </ul>`;

    this.list = this.container.querySelector('.inner');
    document.body.appendChild(this.container);

    this.raf = sinon.stub();
    this.caf = sinon.stub();

    // Make rAF sync
    this.raf.callsArg(0);
  });

  teardown(function() {
    SnapScroll.debug(false);
    this.container.remove();
    if (clock) clock.restore();
  });

  suite('basic', function() {
    setup(function() {
      this.scroll = new SnapScroll({
        list: this.list,
        caf: this.caf,
        raf: this.raf
      });
    });

    test('It pans to follow you finger', function() {
      touchEvent(this.list, 'touchstart', 100, 100);

      touchEvent(window, 'touchmove', 100, 95);
      assert.equal(this.list.style.transform, 'translateY(-5px)');

      touchEvent(window, 'touchmove', 100, 90);
      assert.equal(this.list.style.transform, 'translateY(-10px)');

      touchEvent(window, 'touchmove', 100, 85);
      assert.equal(this.list.style.transform, 'translateY(-15px)');

      touchEvent(window, 'touchmove', 100, 80);
      assert.equal(this.list.style.transform, 'translateY(-20px)');
    });

    test('It recognises quick taps (> 180ms)', function() {
      clock = sinon.useFakeTimers();

      var callback = sinon.spy();

      this.list.addEventListener('tap', callback);

      touchEvent(this.list, 'touchstart', 100, 100);
      clock.tick(100);
      touchEvent(this.list, 'touchend', 100, 100);
      sinon.assert.called(callback);
      callback.reset();

      touchEvent(this.list, 'touchstart', 100, 100);
      clock.tick(150);
      touchEvent(this.list, 'touchend', 100, 100);
      sinon.assert.called(callback);
      callback.reset();

      touchEvent(this.list, 'touchstart', 100, 100);
      clock.tick(250);
      touchEvent(this.list, 'touchend', 100, 100);
      sinon.assert.notCalled(callback);
    });

    test('It doesn\'t scroll past the top of the list', function() {
      touchEvent(this.list, 'touchstart', 100, 100);
      touchEvent(window, 'touchmove', 100, 95);
      assert.equal(this.scroll.scrollTop, 5);
      touchEvent(window, 'touchmove', 100, 90);
      assert.equal(this.scroll.scrollTop, 10);
      touchEvent(window, 'touchmove', 100, 110);
      assert.equal(this.scroll.scrollTop, 0);
    });

    test('It doesn\'t scroll past the bottom of the list', function() {
      var max = this.list.clientHeight - this.list.parentNode.clientHeight;

      this.scroll.scrollTo(max - 40);
      assert.equal(this.scroll.scrollTop, max - 40);

      touchEvent(this.list, 'touchstart', 100, 100);
      touchEvent(window, 'touchmove', 100, 90);
      assert.equal(this.scroll.scrollTop, max - 30);
      touchEvent(window, 'touchmove', 100, 70);
      assert.equal(this.scroll.scrollTop, max - 10);
      touchEvent(window, 'touchmove', 100, 50);

      assert.equal(this.scroll.scrollTop, max, 'didn\'t exceed scroll height');
    });
  });

  suite('speed', function() {
    setup(function() {
      this.scroll = new SnapScroll({
        list: this.list,
        caf: this.caf,
        raf: this.raf
      });
    });

    test('It drifts further if movement was faster', function() {
      clock = sinon.useFakeTimers();

      var slow = {
        start: this.scroll.scrollTop,
        interval: 20
      };

      touchEvent(this.list, 'touchstart', 100, 100);
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

      slow.distance = this.scroll.scrollTop - slow.start;

      var fast = {
        start: this.scroll.scrollTop,
        interval: 10
      };

      touchEvent(this.list, 'touchstart', 100, 100);
      touchEvent(window, 'touchmove', 100, 95);
      clock.tick(fast.interval);
      touchEvent(window, 'touchmove', 100, 90);
      clock.tick(fast.interval);
      touchEvent(window, 'touchmove', 100, 95);
      clock.tick(fast.interval);
      touchEvent(window, 'touchmove', 100, 80);
      clock.tick(fast.interval);
      touchEvent(window, 'touchend', 100, 75);

      fast.distance = this.scroll.scrollTop - fast.start;

      assert.isTrue(fast.distance > slow.distance, 'the faster swipe travelled further');
    });
  });

  suite('circular', function() {
    setup(function() {
      this.scroll = new SnapScroll({
        list: this.list,
        caf: this.caf,
        raf: this.raf,
        circular: true
      });
    });

    test('It duplicates the list contents above and below', function() {
      var clones = this.list.querySelectorAll('div');
      assert.equal(clones[0].children.length, 12);
      assert.equal(clones[1].children.length, 12);
    });

    test('It when the scrollTop is < 0 jump to the bottom', function() {

      touchEvent(this.list, 'touchstart', 100, 100);

      assert.equal(this.scroll.scrollTop, 0);

      touchEvent(window, 'touchmove', 100, 95);

      assert.equal(this.scroll.scrollTop, 5);

      touchEvent(window, 'touchmove', 100, 90);

      assert.equal(this.scroll.scrollTop, 10);

      touchEvent(window, 'touchmove', 100, 95);
      touchEvent(window, 'touchmove', 100, 100);
      touchEvent(window, 'touchmove', 100, 105);

      assert.equal(this.scroll.scrollTop, this.list.clientHeight - 5,
        'It jumps to the bottom of the list when it exceeds the scroll bounds');
    });

    test('It jumps to the top when the list scrolls off the top', function() {
      var start = this.list.clientHeight - 30;

      // Start at the bottom of the list
      this.scroll.scrollTo(start);

      assert.equal(this.scroll.scrollTop, start);

      touchEvent(this.list, 'touchstart', 100, 100);
      touchEvent(window, 'touchmove', 100, 80);
      touchEvent(window, 'touchmove', 100, 70);
      touchEvent(window, 'touchmove', 100, 60);

      assert.equal(this.scroll.scrollTop, 10,
        'It jumps to the top of the list');
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