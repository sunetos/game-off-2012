/// <reference path="libs/jquery.ts" />

module Msg {
  var $elem = $({});

  export function subscribe(topic:string, cb:Function) {
    $elem.on(topic, () => {
      return cb.apply(this, Array.prototype.slice.call(arguments, 1));
    });
  };

  export function unsubscribe(...args: any[]) {
    $elem.off.apply($elem, args);
  };

  export function publish(...args: any[]) {
    $elem.trigger.apply($elem, args);
  };
}

interface HasElem {
  $elem: JQuery;
}

class Cell implements HasElem {
  $elem: JQuery;
  constructor(public kind:string) {
    this.$elem = $('<div class="cell"></div>');
  }
}

class CellGrid implements HasElem {
  $elem: JQuery;
  cells: Cell[];
  constructor(public name:string, elem:any) {
    this.$elem = $(elem);
  }
}

class Body implements HasElem {
  $elem: JQuery;
  grids = {};
  constructor(elem:any) {
    this.$elem = $(elem);
    this.$elem.find('section').each((i, v) => {
      var grid = new CellGrid($(v).data('name'), v);
      this.grids[grid.name] = grid;
    });
  }
}

class Game implements HasElem {
  $elem: JQuery;
  body: Body;
  constructor(elem:any) {
    this.$elem = $(elem);
    this.body = new Body(this.$elem.find('.body'));
    Msg.publish('game-init', this);
  }
}
