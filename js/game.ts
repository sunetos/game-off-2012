/// <reference path="libs/defs/jquery-1.8.d.ts" />
/// <reference path="libs/defs/jquery.bbq-1.2.1.d.ts" />
/// <reference path="libs/defs/tween.js-r7.d.ts" />

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
    return items[int(0, items.length - 1)];
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

class DNA {
  // The base properties that all cells share, binary from 1 to 32.
  public code: string = '';
  public ancestor: DNA = null;
  public manager: DNAManager = null;
  public props:string[] = ['reproduce', 'apoptosis', 'grow', 'enzyme1',
                           'enzyme2', 'misc1', 'misc2'];

  constructor(public reproduce:number=1, public apoptosis:number=1,
              public grow:number=1, public enzyme1:number=1,
              public enzyme2:number=1, public misc1:number=1,
              public misc2:number=1) {
    this.buildCode();
  }

  buildCode() {
    // The property order matters.
    this.props.forEach((prop:string) => {
      this.code += this[prop].toString(2);
    });
  }

  copy(mutate?:bool=true) {
    var doMutate:bool = Random.int(1, this.manager.mutateResist) === 1;
    if (!doMutate) return this;

    var copy:DNA = new DNA();
    copy.ancestor = this;
    copy.manager = this.manager;
    this.props.forEach((prop:string) => {
      copy[prop] = this[prop];
    });

    var mutateProps:string[] = [];
    var mutateCount:number = Random.int(1, this.manager.mutateCount);
    for (var i = 0; i < mutateCount; ++i) {
      var prop:string = Random.choice(this.props);
      while (mutateProps.indexOf(prop) !== -1) prop = Random.choice(this.props);
    }

    // TODO: Figure out how to handle zeroes.
    mutateProps.forEach((prop:string) => {
      var amount:number = Random.int(1, this.manager.mutateAmount);
      var dir:number = (Random.int(0, 1) - 1) | 1;
      copy[prop] = (copy[prop] + amount*dir) % 32;
    });

    copy.buildCode();
    return copy;
  }
}

class DNAManager {
  // Control properties of all DNA over time.
  public root: DNA = null;
  // Mutation resistance goes down over time, and count goes up.
  public mutateResist: number = 20;
  public mutateCount: number = 1;
  public mutateAmount: number = 2;

  constructor(root?:DNA) {
    this.root = root || new DNA(
        Random.int(8, 12), Random.int(8, 12), Random.int(8, 12),
        Random.int(8, 12), Random.int(8, 12), Random.int(8, 12),
        Random.int(8, 12));
    this.root.manager = this;
  }
}

class CellProperties {
  // The properties are scale factors against the dna.
  constructor(public dna:DNA, public reproduce:number=5,
              public apoptosis:number=16, public grow:number=10,
              public enzyme1:number=16, public enzyme2:number=16) {
  }
}

var CELL_DEFS = {
    'brain': {},
    'colon': {},
    'eye': {},
    'lung': {},
    'heart': {},
    'liver': {},
    'muscle': {},
    'skin': {},
};
var CELL_KINDS = Object.keys(CELL_DEFS);
var CELL_REGIONS = {
    'head': ['brain', 'eye'],
    'torso': ['lung', 'heart'],
    'midsection': ['liver', 'colon'],
    'legs': ['muscle', 'skin'],
};
var CELL_BROADCAST = 500;  // ms


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
    var dna:DNA = new DNA();
    this.props = new CellProperties(dna, Random.int(3, 8), Random.int(10, 20));
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
    var deathTime = this.props.apoptosis*1000;
    this.deathT = new TWEEN.Tween({life: this.props.apoptosis})
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
    if (this.grid.isVisible()) {
      var $cloner = cloner.$elem, clonerElem = $cloner.get(0);
      var pos = this.$elem.position(), cpos = $cloner.position();
      var $clone = $cloner.clone().css({
          position: 'absolute', left: cpos.left, top: cpos.top
      }).appendTo($cloner.parent());
      $clone.animate({left: pos.left, top: pos.top}, 200, 'swing', () => {
        $clone.remove();
        this.become(cloner.kind, cloner.props);
      });
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
  constructor(public region:BodyRegion, public index:number, public name:string,
              elem:any, cfg:any) {
    this.$elem = $(elem);
    this.rows = Math.max(1, cfg.rows);
    this.cols = Math.max(1, cfg.cols);
    this.fill();

    var seedKind = CELL_REGIONS[region.name][index];
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
  isVisible():bool {
    return this.region.isVisible();
  }
}

class BodyRegion implements HasElem {
  $elem: JQuery;
  public grids:any = {};
  constructor(public name:string, elem:any, cfg:any) {
    this.$elem = $(elem);
    this.$elem.find('.grid').each((i, v) => {
      var grid = new CellGrid(this, i, $(v).data('name'), $(v).find('.cells'), cfg);
      this.grids[grid.name] = grid;
    });
  }
  isVisible():bool {
    return ($.bbq.getState('region') === this.name);
  }
}

class Body implements HasElem {
  $elem: JQuery;
  public regions:any = {};
  constructor(elem:any, cfg:any) {
    this.$elem = $(elem);
    this.$elem.find('section').each((i, v) => {
      var region = new BodyRegion($(v).data('name'), v, cfg);
      this.regions[region.name] = region;
    });
  }
}

class Game implements HasElem {
  $elem: JQuery;
  body: Body;
  dnaMgr: DNAManager;
  constructor(elem:any, cfg:any) {
    this.$elem = $(elem);
    this.body = new Body(this.$elem.find('.body'), cfg);
    this.dnaMgr = new DNAManager();
    Msg.pub('game:init', this);
  }
}
