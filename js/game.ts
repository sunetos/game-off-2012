/// <reference path="libs/jquery.ts" />

// Simple pubsub based on https://gist.github.com/1319216
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
    return items[int(0, items.length)];
  }
}


// Automate boilerplate required for things like callbacks after stopping typing
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

interface HasElem {
  $elem: JQuery;
}

interface InGrid {
  row: number;
  col: number;
  setPos(row:number, col:number);
}

var CELL_DEFS = {
    'brain': {},
    'lung': {},
    'liver': {},
    'muscle': {},
};
var CELL_KINDS = Object.keys(CELL_DEFS);
var CELL_REGIONS = {
    'head': ['brain'],
    'torso': ['lung'],
    'midsection': ['liver'],
    'legs': ['muscle'],
};
var CELL_BROADCAST = 50;  // ms

class CellProperties {
  constructor(public reproduce:number=5, public apostosis:number=10) {
  }
}


class Cell implements HasElem, InGrid {
  $elem:JQuery;
  row:number;
  col:number;
  broadcastT:any;
  deathT:any;
  props:CellProperties;

  constructor(public kind:string) {
    this.$elem = $('<div class="cell"></div>').addClass(kind);
    this.row = this.col = 0;
    this.broadcastT = renewableTimeout(this.broadcast, CELL_BROADCAST);
    this.deathT = renewableTimeout(this.die, CELL_BROADCAST);
    this.props = new CellProperties(Random.int(3, 8), Random.int(6, 15));
  }
  /** Only call this once for now, there's no cleanup. */
  setPos(row:number, col:number) {
    this.row = row;
    this.col = col;
    this.$elem.data('cell-row', row).data('cell-col', col);
    [row - 1, row, row + 1].forEach((r) => {
      [col - 1, col, col + 1].forEach((c) => {
        if (r === row && c === col) return;
        Msg.sub('cell:vacant:' + r + 'x' + c, this.request);
        console.log('cell-vacant:' + r + 'x' + c);
      });
    });
  }
  birth() {
    Msg.pub('cell:birth', this);
    console.log('birth', this.row, this.col, this.kind, this.kind === 'empty');
    if (this.kind === 'empty') this.broadcastT.set();
  }
  broadcast() {
    if (this.kind !== 'empty') return;

    var suitors = [];
    function response(cell:Cell) {
    }
    Msg.sub('cell:response:' + this.row + 'x' + this.col, (cell) => {
      suitors.push(cell);
      console.log(suitors);
    });
    Msg.pub('cell:vacant:' + this.row + 'x' + this.col, this);
    this.broadcastT.set();
  }
  request(other:Cell) {
    console.log('Got a request', this.kind);
    if (this.kind === 'empty') return;
    Msg.pub('cell:response:' + other.row + 'x' + other.col, this);
    console.log('cell:response:' + other.row + 'x' + other.col, this);
  }
  die(reason:string, broadcast:bool=true) {
    Msg.pub('cell:death', self, reason);
    this.$elem.removeClass(CELL_KINDS).addClass('empty');
    if (broadcast) {
      console.log('setting timer');
      this.broadcastT.set();
    }
  }
  become(kind:string) {
    this.kind = kind;
    this.$elem.removeClass('empty').addClass(kind);
    this.birth();
  }
}

class CellGrid implements HasElem {
  $elem: JQuery;
  public cells:Cell[] = [];
  rows = 1;
  cols = 1;
  constructor(public name:string, elem:any, cfg) {
    this.$elem = $(elem);
    this.rows = Math.max(1, cfg.rows);
    this.cols = Math.max(1, cfg.cols);
    this.fill();
    // TODO: Maybe randomize or something.
    var seedKind = CELL_REGIONS[name][0];
    this.seed(seedKind);
  }
  clear() {
    this.cells.forEach((cell) => { cell.die('clear'); });
  }
  fill(kind:string='empty') {
    this.clear();
    for (var row = 0; row < this.rows; ++row) {
      for (var col = 0; col < this.cols; ++col) {
        var cell = new Cell(kind);
        cell.setPos(row, col);
        this.$elem.append(cell.$elem);
        this.cells.push(cell);
        cell.birth();
      }
    }
  }
  /** Assuming a grid of empty cells, kick things off with a single cell. */
  seed(kind:string) {
    var cell = this.cells[0];
    cell.die('seeding');
    cell.become(kind);
  }
}

class Body implements HasElem {
  $elem: JQuery;
  grids = {};
  constructor(elem:any, cfg:any) {
    this.$elem = $(elem);
    this.$elem.find('section').each((i, v) => {
      var grid = new CellGrid($(v).data('name'), $(v).find('.cells'), cfg);
      this.grids[grid.name] = grid;
    });
  }
}

class Game implements HasElem {
  $elem: JQuery;
  body: Body;
  constructor(elem:any, cfg:any) {
    this.$elem = $(elem);
    this.body = new Body(this.$elem.find('.body'), cfg);
    Msg.pub('game:init', this);
  }
}
