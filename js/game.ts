/// <reference path="libs/defs/jquery-1.8.d.ts" />
/// <reference path="libs/defs/jquery.bbq-1.2.1.d.ts" />
/// <reference path="libs/defs/tween.js-r7.d.ts" />
/// <reference path="tea-cipher.ts" />
/// <reference path="util.ts" />


interface HasElem {
  $elem: JQuery;
}

/** The properties are scale factors against the dna. */
class CellProperties {
  constructor(public reproduce:number=5, public apoptosis:number=16,
              public grow:number=10, public enzyme1:number=1,
              public enzyme2:number=1) {
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

enum DiseaseCondition {
  LOW,
  HIGH,
}

class Disease {
  constructor(public name:string, public condition:DiseaseCondition) {
  }
}

class Enzyme {
  constructor(public name:string, public title:string, public diseases:Disease[]) {
  }
}

var ENZYMES = {
    'alp': new Enzyme('ALP', 'Alkaline phosphatase', [
        new Disease("Paget's disease", DiseaseCondition.HIGH),
        new Disease('Aplastic anemia', DiseaseCondition.LOW),
    ]),
    'alt': new Enzyme('ALT', 'Alanine transaminase', [
        new Disease('Cirrhosis', DiseaseCondition.HIGH),
        new Disease('Diabetes', DiseaseCondition.HIGH),
    ]),
    'ast': new Enzyme('AST', 'Aspartate transaminase', [
        new Disease('Hepatitis', DiseaseCondition.HIGH),
    ]),
    'bace1': new Enzyme('BACE1', 'Beta-secretase 1', [
        new Disease('Alzheimers', DiseaseCondition.HIGH),
    ]),
    'ca': new Enzyme('CA', 'Carbonic anhydrase', [
        new Disease('Acidosis', DiseaseCondition.LOW),
    ]),
    'ck': new Enzyme('CK', 'Creatine kinase', [
        new Disease('Rhabdomyolysis', DiseaseCondition.HIGH),
    ]),
    'e-cadherin': new Enzyme('CAM 120/80', 'E-cadherin', [
        new Disease('Eczema', DiseaseCondition.HIGH),
    ]),
    'gastrin': new Enzyme('Gastrin', 'Gastrin', [
        new Disease('Gastritis', DiseaseCondition.HIGH),
        new Disease('Zollinger-Ellison syndrome', DiseaseCondition.HIGH),
    ]),
    'hexosaminidase': new Enzyme('Hexosaminidase', 'Hexosaminidase', [
        new Disease('Sandhoff disease', DiseaseCondition.LOW),
        new Disease('Tay-Sachs disease', DiseaseCondition.LOW),
    ]),
    'glutathione': new Enzyme('Glutathione', 'Glutathione', [
        new Disease('Cataracts', DiseaseCondition.LOW),
    ]),
    'lysozyme': new Enzyme('Lysozyme', 'Lysozyme', [
        new Disease('Conjunctivitis', DiseaseCondition.LOW),
    ]),
    'pepsin': new Enzyme('Pepsin', 'Pepsin', [
        new Disease('Peptic ulcer', DiseaseCondition.HIGH),
    ]),
    'tnf-a': new Enzyme('TNF-α', 'Tumor necrosis factor-alpha', [
        new Disease('Psoriasis', DiseaseCondition.HIGH),
        new Disease('Systemic Sclerosis', DiseaseCondition.HIGH),
    ]),
    'trap': new Enzyme('TRAP', 'Tartrate-resistant acid phosphatase', [
        new Disease('Obesity', DiseaseCondition.HIGH),
        new Disease('Osteoporosis', DiseaseCondition.HIGH),
    ]),
    'troponin': new Enzyme('Troponin', 'Troponin', [
        new Disease('Heart attack', DiseaseCondition.HIGH),
        new Disease('Myocarditis', DiseaseCondition.HIGH),
    ]),
    'trypsin': new Enzyme('Trypsin', 'Trypsin', [
        new Disease('Emphysema', DiseaseCondition.HIGH),
    ]),
};
var CELL_DEFS = {
    'bone': {props: new CellProperties(1, 3, 1),
        enzymes: ['alp', 'trap']},
    'brain': {props: new CellProperties(1, 12, 2),
        enzymes: ['hexosaminidase', 'bace1']},
    'eye': {props: new CellProperties(1, 5, 1),
        enzymes: ['glutathione', 'lysozyme']},
    'heart': {props: new CellProperties(1, 4, 1),
        enzymes: ['ck', 'troponin']},
    'liver': {props: new CellProperties(1, 4, 1),
        enzymes: ['ast', 'alt']},
    'lung': {props: new CellProperties(1, 5, 1),
        enzymes: ['trypsin', 'ca']},
    'skin': {props: new CellProperties(1, 6, 1),
        enzymes: ['tnf-a', 'e-cadherin']},
    'stomach': {props: new CellProperties(1, 3, 1),
        enzymes: ['gastrin', 'pepsin']},
};
var CELL_KINDS = Object.keys(CELL_DEFS);
var CELL_REGIONS = {
    'head': ['brain', 'eye'],
    'torso': ['lung', 'heart'],
    'midsection': ['liver', 'stomach'],
    'legs': ['skin', 'bone'],
};

var CELL_BROADCAST = 500;  // ms
var CELL_IMG = '/img/blank-cell.png';
var FULL_W = 40, FULL_H = 40;
var EMPTY_W = 4, EMPTY_H = 4, EMPTY_Z = 0.1;
var GAME_MS = 1000*60*20;  // Game lasts twenty minutes
//GAME_MS *= 0.001;  // For debugging
var MAX_MUTATE_MS = GAME_MS*0.5;
var DISEASE_CHANCE = 4;

class DiseaseManager {
  public current:any = {};
  constructor(public chance:number) { }

  acquire(disease:Disease) {
    if (this.current[disease.name]) return;

    this.current[disease.name] = disease;
    Msg.pub('disease:acquire', disease);
  }
  recover(disease:Disease) {
    if (!this.current[disease.name]) return;

    delete this.current[disease.name];
    Msg.pub('disease:recover', disease);
  }
}

class EnzymeLevel {
  public val:number = 0;
  constructor(public enzyme:Enzyme, public start:number, public low:number,
              public high:number, public min:number, public max:number) {
    this.val = start;
  }
}

class EnzymeManager {
  public levels:any = {};
  constructor(public disMgr:DiseaseManager, cellsPerKind:number) {
    for (var name in ENZYMES) {
      var enzyme:Enzyme = ENZYMES[name];
      var start = 0;
      var low = cellsPerKind*11;
      var high = cellsPerKind*19;
      var min = cellsPerKind*2, max = cellsPerKind*31;
      this.levels[name] = new EnzymeLevel(enzyme, start, low, high, min, max);
    }
  }
  add(cell:Cell) {
    var enzymes:string[] = CELL_DEFS[cell.kind].enzymes;
    var level1:EnzymeLevel = this.levels[enzymes[0]];
    var level2:EnzymeLevel = this.levels[enzymes[1]];
    level1.val += cell.props.enzyme1;
    level2.val += cell.props.enzyme2;
    this.update(enzymes[0], level1);
    this.update(enzymes[1], level2);
  }
  subtract(cell:Cell) {
    var enzymes:string[] = CELL_DEFS[cell.kind].enzymes;
    var level1:EnzymeLevel = this.levels[enzymes[0]];
    var level2:EnzymeLevel = this.levels[enzymes[1]];
    level1.val -= cell.props.enzyme1;
    level2.val -= cell.props.enzyme2;
    this.update(enzymes[0], level1);
    this.update(enzymes[1], level2);
  }
  update(name:string, level:EnzymeLevel) {
    Msg.pub('enzyme:update', name, level);
    var low = (level.val <= level.low), high = (level.val >= level.high);
    if (low || high) {
      level.enzyme.diseases.forEach((disease) => {
        var infect:bool = false;
        if ((low && disease.condition === DiseaseCondition.LOW) ||
            (high && disease.condition === DiseaseCondition.HIGH)) {
          infect = Random.chance(this.disMgr.chance);
        }
        if (infect) {
          this.disMgr.acquire(disease);
        }
      });
    }
  }
}

class EnzymeStats implements HasElem {
  $elem: JQuery;
  public levels:JQuery[] = [];
  constructor(elem:any, cfg:any) {
    this.$elem = $(elem);
    var $levels = this.$elem.find('.levels').empty();
    var $organs = this.$elem.find('.organs').empty();

    for (var organ in CELL_DEFS) {
      var organName = organ[0].toUpperCase() + organ.slice(1);
      var $organ = $('<li class="organ"></li>').text(organName);
      var $fix = $('<button class="fix">Fix</button>').appendTo($organ);
      $fix.data('organ', organ).on('click', (e) => {
        var $pop = $('#templates .organ-fix').clone();
        $pop.find('.fix-type button').on('click', function(e) {
          var fixType = $(e.target).closest('.fix-type').data('fix-type');
        });
        $pop.appendTo($('body:first')).lightbox();
      });
      $organs.append($organ);

      CELL_DEFS[organ].enzymes.forEach((name) => {
        var enzyme:Enzyme = ENZYMES[name];
        var $level = $('<li class="level"></li>');
        var $name = $('<span class="name"></span>').text(enzyme.name).appendTo($level);
        $name.attr('title', enzyme.title);
        var $val = $('<span class="val"></span>').appendTo($level);
        $level.attr('id', name).appendTo($levels);
        this.levels[name] = $val;
      });
    }
    Msg.sub('enzyme:update', proxy(this, 'update'));
  }
  update(name:string, level:EnzymeLevel) {
    var $level = this.levels[name];
    var percent = 100.0*(level.val/level.max);
    $level.css('width', percent + '%');
    $level.toggleClass('low', level.val <= level.low);
    $level.toggleClass('high', level.val >= level.high);
  }
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

/** The base properties that all cells share, binary from 1 to 32. */
class DNA {
  public code: string = '';
  public encoded: string = '';
  public ancestor: DNA = null;
  public manager: DNAManager = null;
  public props:string[] = ['reproduce', 'apoptosis', 'grow', 'enzyme1',
                           'enzyme2', 'misc1'];

  constructor(public key:number[], public reproduce:number=1,
              public apoptosis:number=1, public grow:number=1, public enzyme1:number=1,
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
    this.encoded = TEA.encrypt64b(this.key, this.code);
  }

  copy(mutate?:bool=true):DNA {
    var doMutate:bool = mutate || Random.chance(this.manager.mutateResist);
    if (!doMutate) return this;

    var copy:DNA = new DNA(this.key);
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
      mutateProps.push(prop);
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
    for (var i = 32; i < dna.encoded.length; ++i) {
      var cls = (dna.encoded[i] | 0) ? 'one' : 'zero';
      this.$elem.append($('<div></div>').addClass(cls));
    }
  }
}

/** Control properties of all DNA over time. */
class DNAManager {
  $info:JQuery; $resist:JQuery; $count:JQuery; $amount:JQuery;

  public root: DNA = null;
  // Mutation resistance goes down over time, and count goes up.
  public mutateResist: number = 20;
  public mutateCount: number = 1;
  public mutateAmount: number = 2;

  constructor(cfg:any, root?:DNA) {
    // I think the DNA needs to start the same every game for stability.
    this.root = root || new DNA(cfg.keyMgr.key, 10, 10, 10, 15, 15, 15);
    this.root.manager = this;
    this.$info = $('.mutate-info');
    this.$resist = this.$info.find('.resist');
    this.$count = this.$info.find('.count');
    this.$amount = this.$info.find('.amount');

    var tween = new TWEEN.Tween(this);
    tween.to({mutateResist: 5, mutateCount: 5, mutateAmount: 3}, MAX_MUTATE_MS);
    tween.onUpdate(this.updateInfo);
    tween.start();
  }
  updateInfo() {
    this.$resist.text(this.mutateResist.toFixed(2));
    this.$count.text(this.mutateCount.toFixed(2));
    this.$amount.text(this.mutateAmount.toFixed(2));
  }
}

class ProgressStats implements HasElem {
  $elem: JQuery;
  constructor($elem:JQuery) {
    var tween = new TWEEN.Tween({days: 0}).to({days: 75*365}, GAME_MS);
    var $days = $elem.find('.days:first'), $years = $elem.find('.years:first');
    var lastDays = 0;
    tween.onUpdate(function() {
      var days = this.days | 0;
      if (days === lastDays) return;
      lastDays = days;

      var years = (days/365.0) | 0;
      $days.text('' + (days % 365));
      $years.text('' + years);
    }).onComplete(() => {
      TWEEN.getAll().forEach((tween:TWEEN.Tween) => {
        tween.stop();
      });

      var $pop = $('#templates .game-win').clone().lightbox();
      $pop.appendTo($('body:first'));
    }).start();
  }
}

/** Where most of the magic happens. */
class Cell implements HasElem, InGrid {
  $elem: JQuery;
  $body: JQuery;
  $img: JQuery;
  $info: JQuery;
  infoT: any;
  $props: JQuery;
  grid: CellGrid;
  row: number;
  col: number;
  gridPos: string;
  broadcastT: any;
  deathT: TWEEN.Tween;
  props: CellProperties;
  respond: Function;  // Set every broadcast
  enzMgr: EnzymeManager;

  constructor(public cfg:any, public dna:DNA, public kind:string) {
    this.$elem = $('<div class="cell"></div>').addClass(kind);
    this.$body = $('<div class="body" width="100%" height="100%"></div>')
                 .appendTo(this.$elem);
    this.$img = $('<img alt=""/>').attr('src', CELL_IMG).appendTo(this.$body);
    this.row = this.col = 0;
    this.enzMgr = cfg.enzMgr;
    this.broadcastT = renewableTimeout(proxy(this, 'broadcast'), CELL_BROADCAST);
    if (kind === 'empty') {
      this.props = new CellProperties();
    } else {
      this.props = CELL_DEFS[kind].props.copy();
      this.props.scale(dna);
    }
    this.$elem.on('show-info', proxy(this, 'showInfo'));
    this.$elem.on('hide-info', proxy(this, 'hideInfo'));
    this.infoT = renewableTimeout(() => {
      this.$info.remove();
      this.$info = null;
    }, 250);
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
  showInfo() {
    this.infoT.clear();
    if (this.$info) return;

    var left = this.col*this.grid.colW, top = this.row*this.grid.rowH;
    this.$info = $('<div class="cell-info"></div>');
    this.$info.data('target', this.$elem);
    this.$info.append('<h5>DNA History</h5>');
    var $ol = $('<ol></ol>').appendTo(this.$info);

    var dna:DNA = this.dna, $lis = [];
    while (dna) {
      var dnaDisplay:DNADisplay = new DNADisplay(dna);
      $lis.push($('<li></li>').append(dnaDisplay.$elem));
      dna = dna.ancestor;
    }
    $lis.reverse();
    $lis.forEach(($li) => $ol.append($li));

    var info = this.$info.get(0);
    this.$elem.closest('.grid').append(this.$info);
    info.scrollTop = info.scrollHeight;
  }
  hideInfo() {
    this.infoT.set();
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
    this.enzMgr.add(this);
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
    this.$img.css('rotate3d', '0, 0, 0, 0');
    if (skipSec > growSec) {
      this.$img.css('scale', 1.0);
    } else {
      growSec -= skipSec;
      var growMs = growSec*1000;
      var startZ = EMPTY_Z + (1.0 - EMPTY_Z)*fastForward;
      this.$img.css('scale', startZ);
      this.$img.transition({scale: 1.0}, growMs, 'linear');
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
      var left = this.col*this.grid.colW, top = this.row*this.grid.rowH;
      var cleft = cell.col*cell.grid.colW, ctop = cell.row*cell.grid.rowH;
      var $clone = $cell.clone().css({
          position: 'absolute', left: cleft, top: ctop, rotate3d: '0, 0, 0, 0'
      }).appendTo($cell.parent());
      var $img = $clone.find('img').pause();
      $img.transition({scale: EMPTY_Z}, 500, 'linear');
      $clone.transition({left: left, top: top}, 500, 'linear', () => {
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
    this.enzMgr.subtract(this);
    this.kind = 'empty';
    this.$elem.pause().removeClass(CELL_KINDS).addClass('empty');
    this.$img.pause();
    //resize(this.$img, EMPTY_W, EMPTY_H, -EMPTY_W/2, -EMPTY_H/2);
    this.$img.css('scale', EMPTY_Z);
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
  colW = 1;
  rowH = 1;
  constructor(public region:BodyRegion, public index:number, public name:string,
              elem:any, cfg:any) {
    this.$elem = $(elem);
    this.$table = $('<div class="table"></div>').appendTo(this.$elem);
    this.rows = Math.max(1, cfg.rows);
    this.cols = Math.max(1, cfg.cols);
    $(window).on('resize hashchange', proxy(this, 'resize'));
    $(document).ready(proxy(this, 'resize'));
    var seedKind = CELL_REGIONS[region.name][index];
    this.fill(cfg.rootDna, seedKind, cfg);
  }
  resize() {
    setTimeout(() => {
      if (this.visible) {
        this.rowH = this.$elem.outerHeight()/this.rows;
        this.colW = this.$elem.outerWidth()/this.cols;
      }
    }, 1);
  }
  clear() {
    this.cells.forEach((cell) => { cell.die('clear'); });
    this.$table.empty();
  }
  fill(dna:DNA, kind:string='empty', cfg:any={}) {
    this.clear();
    var w = 100.0/this.cols, h = 100.0/this.rows;
    for (var row = 0; row < this.rows; ++row) {
      for (var col = 0; col < this.cols; ++col) {
        var cell = new Cell(cfg, dna, kind);
        cell.$elem.css({left: col*w + '%', top: row*h + '%'}).appendTo(this.$table);
        cell.addToGrid(this, row, col);
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

interface JQuery {
  lightbox(): JQuery;
}

/* The main controller for the game. */
class Game implements HasElem {
  $elem: JQuery;
  visible: bool;
  body: Body;
  dnaMgr: DNAManager;
  keyMgr: KeyManager;
  disMgr: DiseaseManager;
  enzMgr: EnzymeManager;
  enzStats: EnzymeStats;
  prgStats: ProgressStats;

  constructor(elem:any, cfg:any) {
    this.$elem = $(elem);
    this.visible = true;
    this.keyMgr = cfg.keyMgr = new KeyManager();
    this.dnaMgr = cfg.dnaMgr = new DNAManager(cfg);
    cfg.rootDna = this.dnaMgr.root;

    this.disMgr = cfg.disMgr = new DiseaseManager(DISEASE_CHANCE);
    this.enzMgr = cfg.enzMgr = new EnzymeManager(cfg.disMgr, cfg.rows*cfg.cols);
    this.enzStats = new EnzymeStats(this.$elem.find('.enzyme-info'), cfg);
    this.prgStats = new ProgressStats(this.$elem.find('.life-info'));

    this.body = new Body(this, this.$elem.find('.body'), cfg);
    Msg.pub('game:init', this);
  }
}
