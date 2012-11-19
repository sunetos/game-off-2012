/// <reference path="libs/defs/jquery-1.8.d.ts" />

/** Simple pubsub based on https://gist.github.com/1319216 */
module Msg {
  var $elem = $({});

  export function sub(topic:string, cb:Function) {
    $elem.on(topic, () => {
      return cb.apply(this, Array.prototype.slice.call(arguments, 1));
    });
  };

  export function one(topic:string, cb:Function) {
    $elem.one(topic, () => {
      return cb.apply(this, Array.prototype.slice.call(arguments, 1));
    });
  };

  export function unsub(...args: any[]) {
    $elem.off.apply($elem, args);
  };

  export function pub(...args: any[]) {
    $elem.trigger.apply($elem, args);
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

/** jQuery width and height are still buggy with box-sizing, so use css. */
function resize($elem:JQuery, w, h) {
  var elem = $elem.get(0);
  elem.style.width = w + 'px';
  elem.style.height = h + 'px';
  //$elem.css({width: w + 'px', height: h + 'px'});
  return $elem;
}
