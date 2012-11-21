/// <reference path="libs/defs/jquery-1.8.d.ts" />
/// <reference path="libs/defs/jquery.bbq-1.2.1.d.ts" />
/// <reference path="libs/defs/tween.js-r7.d.ts" />
/// <reference path="tea-cipher.ts" />
/// <reference path="util.ts" />


interface HasElem {
  $elem: JQuery;
}

interface InGrid {
  row: number;
  col: number;
  addToGrid(grid:any, row:number, col:number);
}

class KeyManager {
  public key:number[];
  constructor(key?:number[]) {
    this.key = key || TEA.randomKey();
  }
}

var keyMgr:KeyManager = new KeyManager();


/** The base properties that all cells share, binary from 1 to 32. */
class DNA {
  public code: string = '';
  public encoded: string = '';
  public ancestor: DNA = null;
  public manager: DNAManager = null;
  public props:string[] = ['reproduce', 'apoptosis', 'grow', 'enzyme1',
                           'enzyme2', 'misc1'];

  constructor(public reproduce:number=1, public apoptosis:number=1,
              public grow:number=1, public enzyme1:number=1,
              public enzyme2:number=1, public misc1:number=1) {
    this.buildCode();
  }

  buildCode() {
    // The property order matters. Only supports 6 props (30 bits) for now.
    var val:number = 0;
    this.props.forEach((prop:string, i:number) => {
      val |= this[prop] << (i<<2);
    });
    this.code = TEA.int2bin(val);
    this.encoded = TEA.encrypt64b(keyMgr.key, this.code);
  }

  copy(mutate?:bool=true):DNA {
    var doMutate:bool = mutate || Random.int(1, this.manager.mutateResist) === 1;
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

/** Render a DNA string as html. */
class DNADisplay implements HasElem {
  $elem: JQuery;
  constructor(public dna:DNA) {
    this.$elem = $('<div class="dna"></div>');
    for (var i = 0; i < dna.encoded.length; ++i) {
      var cls = (dna.encoded[i] | 0) ? 'one' : 'zero';
      this.$elem.append($('<div></div>').addClass(cls));
    }
  }
}

/** Control properties of all DNA over time. */
class DNAManager {
  public root: DNA = null;
  // Mutation resistance goes down over time, and count goes up.
  public mutateResist: number = 20;
  public mutateCount: number = 1;
  public mutateAmount: number = 2;

  constructor(root?:DNA) {
    // I think the DNA needs to start the same every game for stability.
    this.root = root || new DNA(10, 10, 10, 10, 10, 10);
    this.root.manager = this;
  }
}

/** The properties are scale factors against the dna. */
class CellProperties {
  constructor(public reproduce:number=5, public apoptosis:number=16,
              public grow:number=10, public enzyme1:number=16,
              public enzyme2:number=16) {
  }

  copy():CellProperties {
    var props = new CellProperties();
    Object.keys(this).forEach((prop) => {
      props[prop] = (this[prop]['copy']) ? this[prop].copy() : this[prop];
    });
    return props;
  }

  /** This is mainly used to scale the cell properties by the DNA base. */
  scale(props:any) {
    Object.keys(this).forEach((prop) => {
      this[prop] = (this[prop]*props[prop]) | 0;
    });
  }
}

var CELL_DEFS = {
    'bone': {props: new CellProperties(1, 3, 1, 1, 1), enzymes: []},
    'brain': {props: new CellProperties(1, 12, 2, 1, 1)},
    'colon': {props: new CellProperties(1, 3, 1, 1, 1)},
    'eye': {props: new CellProperties(1, 5, 1, 1, 1)},
    'lung': {props: new CellProperties(1, 5, 1, 1, 1)},
    'heart': {props: new CellProperties(1, 4, 1, 1, 1)},
    'liver': {props: new CellProperties(1, 4, 1, 1, 1)},
    'muscle': {props: new CellProperties(1, 6, 1, 1, 1)},
};
var CELL_KINDS = Object.keys(CELL_DEFS);
var CELL_REGIONS = {
    'head': ['brain', 'eye'],
    'torso': ['lung', 'heart'],
    'midsection': ['liver', 'colon'],
    'legs': ['muscle', 'bone'],
};
var CELL_BROADCAST = 500;  // ms
var CELL_IMG = '/img/blank-cell.png';
var FULL_W = 40, FULL_H = 40;
var EMPTY_W = 5, EMPTY_H = 5;


/** Where most of the magic happens. */
class Cell implements HasElem, InGrid {
  $elem: JQuery;
  $img: JQuery;
  $props: JQuery;
  grid: CellGrid;
  row: number;
  col: number;
  gridPos: string;
  broadcastT: any;
  deathT: TWEEN.Tween;
  props: CellProperties;
  respond: Function;  // Set every broadcast

  constructor(public dna:DNA, public kind:string) {
    this.$elem = $('<div class="cell"></div>').addClass(kind);
    this.$img = $('<img/>').attr('src', CELL_IMG).appendTo(this.$elem);
    this.row = this.col = 0;
    this.broadcastT = renewableTimeout(proxy(this, 'broadcast'), CELL_BROADCAST);
    if (kind === 'empty') {
      this.props = new CellProperties();
    } else {
      this.props = CELL_DEFS[kind].props.copy();
      this.props.scale(dna);
    }
    //this.$props = $('<div class="props"></div>').appendTo(this.$elem);
    //this.setPropElems();
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
        Msg.sub('cell:vacant:' + gridPos, this.request, this);
      });
    });
  }
  /** You can fast-forward with a 0-1 scale based on the total life. */
  birth(fastForward:number=0) {
    var lifeSec = this.props.apoptosis, skipSec = 0;
    if (fastForward) {
      skipSec = lifeSec*fastForward;
      lifeSec -= skipSec;
    }
    var lifeMs = lifeSec*1000;
    this.deathT = new TWEEN.Tween({life: this.props.apoptosis})
    this.deathT.to({life: 0}, lifeMs).onComplete(proxy(this, 'die'));
    this.deathT.start();

    var growSec:number = this.props.grow;
    if (skipSec > growSec) {
      resize(this.$elem, FULL_W, FULL_H);
    } else {
      growSec -= skipSec;
      var growMs = growSec*1000;
      var startW = EMPTY_W + (FULL_W - EMPTY_W)*fastForward;
      var startH = EMPTY_H + (FULL_H - EMPTY_H)*fastForward;
      resize(this.$elem, startW, startH);
      this.$elem.transition({width: FULL_W, height: FULL_H}, growMs, 'linear');
    }

    if (this.kind === 'empty') this.broadcastT.set();
    Msg.pub('cell:birth', this);
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
    var cell = suitors[0];
    this.cloneFrom(cell);
  }
  cloneFrom(cell:Cell) {
    // Need to capture these now in case the cell dies during timer.
    var kind = cell.kind, dna = cell.dna;

    if (this.grid.visible) {
      var $cell = cell.$elem, cellElem = $cell.get(0);
      var pos = this.$elem.position(), cpos = $cell.position();
      var $clone = $cell.clone().css({
          position: 'absolute', left: cpos.left, top: cpos.top
      }).appendTo($cell.parent());
      $clone.transition({
          left: pos.left,
          top: pos.top,
          width: EMPTY_W,
          height: EMPTY_H
      }, 500, 'linear', () => {
        $clone.remove();
        this.become(kind, dna);
      });
    } else {
      tweenTimeout(() => this.become(kind, dna), 500);
    }
  }
  request(other:Cell) {
    if (this.kind === 'empty') return;
    other.respond(this);
  }
  die(reason:string, broadcast:bool=true) {
    Msg.pub('cell:death', self, reason);
    this.kind = 'empty';
    this.$elem.stop().pause().removeClass(CELL_KINDS).addClass('empty');
    resize(this.$elem, EMPTY_W, EMPTY_H);
    if (broadcast) {
      this.broadcastT.set();
    }
  }
  become(kind:string, dna?:DNA) {
    this.kind = kind;
    if (dna) {
      this.dna = dna.copy();
    }
    this.props = CELL_DEFS[kind].props.copy();
    this.props.scale(dna);
    this.$elem.removeClass('empty').addClass(kind);
    this.birth();
  }
}

/** Each BodyRegion has multiple grids, and each grid many cells. */
class CellGrid implements HasElem {
  $elem: JQuery;
  $table: JQuery;
  public cells:Cell[] = [];
  rows = 1;
  cols = 1;
  constructor(public region:BodyRegion, public index:number, public name:string,
              elem:any, cfg:any) {
    this.$elem = $(elem);
    this.$table = $('<table></table>').appendTo(this.$elem);
    this.rows = Math.max(1, cfg.rows);
    this.cols = Math.max(1, cfg.cols);
    var seedKind = CELL_REGIONS[region.name][index];
    this.fill(cfg.rootDna, seedKind);
  }
  clear() {
    this.cells.forEach((cell) => { cell.die('clear'); });
    this.$table.empty();
  }
  fill(dna:DNA, kind:string='empty') {
    this.clear();
    for (var col = 0; col < this.cols; ++col) {
      var $col = $('<col></col>').attr('width', 100.0/this.cols + '%')
                                 .attr('height', '100.0%')
                                 .appendTo(this.$table);
    }
    for (var row = 0; row < this.rows; ++row) {
      var $row = $('<tr></tr>').attr('width', '100%')
                               .attr('height', 100.0/this.rows + '%')
                               .appendTo(this.$table);
      for (var col = 0; col < this.cols; ++col) {
        var $col = $('<td></td>').attr('width', 100.0/this.cols + '%')
                                 .attr('height', 100.0/this.rows + '%');
        var cell = new Cell(dna, kind);
        cell.addToGrid(this, row, col);
        $col.append(cell.$elem).appendTo($row);
        this.cells.push(cell);
        var fastFwd = Random.scale(0.8);
        cell.birth(fastFwd);
      }
    }
  }
  /** Assuming a grid of empty cells, kick things off with a single cell. */
  seed(kind:string) {
    var cell = this.cells[0];
    cell.die('seeding');
    cell.become(kind);
  }
  get visible():bool {
    return this.region.visible;
  }
}

/** There are only a few body regions, each containing cell grids. */
class BodyRegion implements HasElem {
  $elem: JQuery;
  public grids:any = {};
  constructor(public body:Body, public name:string, elem:any, cfg:any) {
    this.$elem = $(elem);
    this.$elem.find('.grid').each((i, v) => {
      var grid = new CellGrid(this, i, $(v).data('name'), $(v).find('.cells'), cfg);
      this.grids[grid.name] = grid;
    });
  }
  get visible():bool {
    return (this.body.visible && this.body.visibleRegion  === this.name);
  }
}

/** Kind of the root container for the various cell grids. */
class Body implements HasElem {
  $elem: JQuery;
  public regions:any = {};
  public visibleRegion:string = null;

  constructor(public game:Game, elem:any, cfg:any) {
    this.$elem = $(elem);
    this.$elem.find('section').each((i, v) => {
      var region = new BodyRegion(this, $(v).data('name'), v, cfg);
      this.regions[region.name] = region;
    });
  }
  get visible():bool {
    return this.game.visible;
  }
}

/* The main controller for the game. */
class Game implements HasElem {
  $elem: JQuery;
  visible: bool;
  body: Body;
  dnaMgr: DNAManager;
  constructor(elem:any, cfg:any) {
    this.$elem = $(elem);
    this.visible = true;
    this.dnaMgr = new DNAManager();
    cfg.rootDna = this.dnaMgr.root;
    this.body = new Body(this, this.$elem.find('.body'), cfg);
    Msg.pub('game:init', this);
  }
}
