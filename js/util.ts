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

interface String {
  toTitleCase():string;
}
String.prototype.toTitleCase = function() {
  return this.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

module Random {
  export function int(min:number, max:number):number {
    return ((Math.random()*(max - min + 1)) + min) | 0;
  }
  export function choice(items:any[]):any {
    return items[int(0, items.length - 1)];
  }
  export function scale(scale:number=1.0):number {
    return Math.random()*scale;
  }
  export function chance(outOf:number=1):bool {
    return (int(1, outOf) === 1);
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
  function callSet(overrideI?) {
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
  elem.style.cssText += css.join('');
  return $elem;
}

interface JQuery {
  pause(): JQuery;
}

jQuery.fn.pause = function():JQuery {
  return this.css('transition-duration', '0s');
}

/** From jQuery 1.8 source. */
interface JQueryStatic {
  camelCase(val:string):string;
}
var vendors = ['ms', 'moz', 'webkit', 'o'];
var cssProps = {};
function vendorPropName(style, name) {
  if (name in style) return name;

  // check for vendor prefixed names
  var origName = name, i = vendors.length;

  while (i--) {
    name = vendors[i] + '-' + origName;
    if (name in style) return name;
  }

  return origName;
}

/** Attempting to get better performance than jQuery.animate.enhanced. */
interface JQuery {
  transition(props:any, duration:number, easing?:string, cb?:Function): JQuery;
}
/*
jQuery.fn.transition = function(
    props:any, duration:number, easing:string='linear', cb?:Function):JQuery {
  var trans = [], durStr = (duration | 0) + 'ms';
  var fixedProps = {}, style = this[0].style;
  for (var origProp in props) {
    var prop = origProp;
    prop = cssProps[prop] || (cssProps[props] = vendorPropName(style, prop));
    fixedProps[prop] = props[origProp];
  }
  props = fixedProps;

  for (var prop in props) {
    trans.push([prop, durStr, easing].join(' '));
  }
  this.css('transition', trans.join(', '));
  // For some reason it doesn't work until we read a property back.
  this.css('transition-duration');

  for (var i = 0; i < this.length; ++i) {
    var css = ['; '];
    var style = this[i].style;
    for (var prop in props) {
      var val = props[prop];
      css.push(prop, ': ', (typeof(val) === 'number' && !$.cssNumber[prop])
                           ? val + 'px' : val, '; ');
    }
    style.cssText += css.join('');
  }

  if (cb) tweenTimeout(cb, duration);
  return this;
}
*/
