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
// TODO: Use typescript to build this from CELL_DEFS.
var CELL_KINDS = 'brain lung liver muscle';
var CELL_REGIONS = {
    'head': ['brain'],
    'torso': ['lung'],
    'midsection': ['liver'],
    'legs': ['muscle'],
};


class Cell implements HasElem, InGrid {
  $elem: JQuery;
  row: number;
  col: number;
  bcastI: any;

  constructor(public kind:string) {
    this.$elem = $('<div class="cell"></div>').addClass(kind);
    this.row = this.col = 0;
  }
  setPos(row:number, col:number) {
    this.row = row;
    this.col = col;
    this.$elem.data('cell-row', row).data('cell-col', col);
  }
  birth() {
    Msg.off('cell-vacant', self.request);
    Msg.pub('cell-birth', self);
    Msg.sub('cell-vacant', self.request);
  }
  request() {
  }
  die(reason:string, broadcast:number=0) {
    Msg.pub('cell-death', self, reason);
    this.$elem.removeClass(CELL_KINDS).addClass('empty');
    if (broadcast) {
      this.bcastI  = setInterval(() => {
        Msg.pub('cell-vacant', this);
      }, broadcast);
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
    Msg.pub('game-init', this);
  }
}
