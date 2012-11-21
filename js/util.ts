/// <reference path="libs/defs/jquery-1.8.d.ts" />
/// <reference path="libs/defs/tween.js-r7.d.ts" />

/** Simple lightweight pubsub. */
module Msg {
  var subs = {};

  export function sub(topic:string, cb:Function, context:any=window) {
    (subs[topic] = subs[topic] || []).push([cb, context]);
  };

  export function unsub(topic:string, cb?:Function, context:any=window) {
    if (cb) {
      var cbs = subs[topic];
      for (var i = 0; i < cbs.length; ++i) {
        var cbi = cbs[i];
        if (cb === cbi[0] && context === cbi[1]) {
          cbs.splice(i, 1);
          --i;
        }
      }
    } else {
      delete subs[topic];
    }
  };

  export function pub(topic:string, ...args: any[]) {
    subs[topic] && subs[topic].forEach(function(cbi) {
      cbi[0].apply(cbi[1], args);
    });
  };
}

module Random {
  export function int(min:number, max:number) {
    return ((Math.random()*(max - min + 1)) + min) | 0;
  }
  export function choice(items:any[]) {
    return items[int(0, items.length - 1)];
  }
  export function scale(scale:number=1.0) {
    return Math.random()*scale;
  }
}

function proxy(context:any, prop:string):Function {
  //return $.proxy(context, prop);
  return context[prop].bind(context);
}

/** Automate boilerplate for things like callbacks after stopping typing. */
function renewableTimeout(func, delay) {
  var callT = null, callI = delay;
  function callClear() {
    if (callT) {
      clearTimeout(callT);
      callT = null;
    }
  }
  function callSet(overrideI) {
    callClear();
    callT = setTimeout(function() {
      callT = null;
      func();
    }, (overrideI !== undefined) ? overrideI : callI);
  }
  function callRun() {
    callClear();
    func();
  }
  return {clear: callClear, set: callSet, run: callRun};
}

function tweenTimeout(cb:Function, delay:number):TWEEN.Tween {
  return (new TWEEN.Tween({}).to({}, delay)).onComplete(cb).start();
}

/** jQuery width and height are still buggy with box-sizing, so use css. */
function resize($elem:JQuery, w, h, ml?, mt?) {
  var elem = $elem.get(0);
  var css = ['; width: ', w, 'px; height: ', h, 'px;'];
  if (ml && mt) css.push(' margin-left: ', ml, 'px; margin-top: ', mt, 'px;');
  elem.cssText += css.join('');
  console.log(elem, css.join(''));
  return $elem;
}

interface JQuery {
  pause(): JQuery;
  transition(props:any, duration:number, easing:string, cb?:Function): JQuery;
}

jQuery.fn.pause = function():JQuery {
  return this.css('transition-duration', '0s');
}

/** Attempting to get better performance than jQuery.animate.enhanced. */
jQuery.fn.transition = function(
    props:any, duration:number, easing:string='linear', cb?:Function):JQuery {
  var trans = [], durStr = (duration | 0) + 'ms';
  for (var prop in props) {
    trans.push([prop, durStr, easing].join(' '));
  }
  this.css('transition', trans.join(', '));
  // For some reason it doesn't work until we read a property back.
  this.css('transition-duration');

  for (var prop in props) {
    var val = props[prop];
    for (var i = 0; i < this.length; ++i) {
      this[i].style[prop] = (typeof(val) === 'number') ? val + 'px' : val;
    }
  }

  if (cb) tweenTimeout(cb, duration);
  return this;
}

