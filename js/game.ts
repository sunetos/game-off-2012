/// <reference path="libs/jquery.bbq.ts" />
/// <reference path="libs/tween.d.ts" />

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
  addToGrid(grid:any, row:number, col:number);
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
var CELL_BROADCAST = 500;  // ms

class CellProperties {
  constructor(public reproduce:number=5, public apostosis:number=10) {
  }
}


class Cell implements HasElem, InGrid {
  $elem: JQuery;
  $props: JQuery;
  grid: CellGrid;
  row: number;
  col: number;
  gridPos: string;
  broadcastT: any;
  deathT: TWEEN.Tween;
  props: CellProperties;
  respond: Function;  // Set every broadcast

  constructor(public kind:string) {
    this.$elem = $('<div class="cell"></div>').addClass(kind);
    this.$props = $('<div class="props"></div>').appendTo(this.$elem);
    this.row = this.col = 0;
    this.broadcastT = renewableTimeout($.proxy(this, 'broadcast'), CELL_BROADCAST);
    this.props = new CellProperties(Random.int(3, 8), Random.int(10, 20));
    this.setPropElems();
  }
  setPropElems() {
    Object.keys(this.props).forEach((prop) => {
      var $prop = this.$elem.find('.prop.' + prop);
      if (!$prop.length) {
        $prop = $('<div></div>').addClass('prop ' + prop).appendTo(this.$props);
      }
      $prop.height(this.props[prop]);
    });
  }
  /** Only call this once for now, there's no cleanup. */
  addToGrid(grid:CellGrid, row:number, col:number) {
    this.grid = grid;
    this.row = row;
    this.col = col;
    this.gridPos = grid.name + '-' + row + 'x' + col;
    this.$elem.data('cell-row', row).data('cell-col', col);
    [row - 1, row, row + 1].forEach((r) => {
      [col - 1, col, col + 1].forEach((c) => {
        if (r === row && c === col) return;
        var gridPos = grid.name + '-' + r + 'x' + c;
        Msg.sub('cell:vacant:' + gridPos, $.proxy(this, 'request'));
      });
    });
  }
  birth() {
    Msg.pub('cell:birth', this);
    var deathTime = this.props.apostosis*1000;
    this.deathT = new TWEEN.Tween({life: this.props.apostosis})
    this.deathT.to({life: 0}, deathTime).onComplete($.proxy(this, 'die'));
    this.deathT.start();
    if (this.kind === 'empty') this.broadcastT.set();
  }
  broadcast() {
    if (this.kind !== 'empty') return;

    var suitors = [];
    this.respond = (cell:Cell) => {
      suitors.push(cell);
    }
    Msg.pub('cell:vacant:' + this.gridPos, this);
    if (!suitors.length) {
      this.broadcastT.set();
      return;
    }
    // TODO: Make the selection more advanced.
    suitors.sort((c1, c2) => c1.props.reproduce - c2.props.reproduce);
    var cloner = suitors[0];
    this.cloneFrom(cloner);
  }
  cloneFrom(cloner:Cell) {
    if ($.bbq.getState('region') === this.grid.name) {
      var $cloner = cloner.$elem, clonerElem = $cloner.get(0);
      var pos = this.$elem.position(), cpos = $cloner.position();
      var $clone = $cloner.clone().css({
          position: 'absolute', left: cpos.left, top: cpos.top
      }).appendTo($cloner.parent());
      $clone.animate({left: pos.left, top: pos.top}, 200, 'swing', () => {
        $clone.remove();
        this.become(cloner.kind, cloner.props);
      });
      /*
      var tween = new TWEEN.Tween({left: cpos.left, top: cpos.top}).to({
          left: pos.left, top: pos.top,
      }, 200).onUpdate(function(val) {
        clonerElem.style.left = this.left + 'px';
        clonerElem.style.top = this.top + 'px';
      }).onComplete(() => {
        $clone.remove();
        this.become(cloner.kind, cloner.props);
      }).start();
      */
    } else {
      setTimeout(() => this.become(cloner.kind, cloner.props), 200);
    }
  }
  request(other:Cell) {
    if (this.kind === 'empty') return;
    other.respond(this);
  }
  die(reason:string, broadcast:bool=true) {
    Msg.pub('cell:death', self, reason);
    this.kind = 'empty';
    this.$elem.removeClass(CELL_KINDS).addClass('empty');
    if (broadcast) {
      this.broadcastT.set();
    }
  }
  become(kind:string, props?:CellProperties) {
    this.kind = kind;
    if (props) {
      this.props = props;
      this.setPropElems();
    }
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
        cell.addToGrid(this, row, col);
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
