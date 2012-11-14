var Msg;
(function (Msg) {
    var $elem = $({
    });
    function sub(topic, cb) {
        var _this = this;
        $elem.on(topic, function () {
            return cb.apply(_this, Array.prototype.slice.call(arguments, 1));
        });
    }
    Msg.sub = sub;
    ; ;
    function one(topic, cb) {
        var _this = this;
        $elem.one(topic, function () {
            return cb.apply(_this, Array.prototype.slice.call(arguments, 1));
        });
    }
    Msg.one = one;
    ; ;
    function unsub() {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            args[_i] = arguments[_i + 0];
        }
        $elem.off.apply($elem, args);
    }
    Msg.unsub = unsub;
    ; ;
    function pub() {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            args[_i] = arguments[_i + 0];
        }
        $elem.trigger.apply($elem, args);
    }
    Msg.pub = pub;
    ; ;
})(Msg || (Msg = {}));

var Random;
(function (Random) {
    function int(min, max) {
        return ((Math.random() * (max - min + 1)) + min) | 0;
    }
    Random.int = int;
    function choice(items) {
        return items[int(0, items.length)];
    }
    Random.choice = choice;
})(Random || (Random = {}));

function renewableTimeout(func, delay) {
    var callT = null;
    var callI = delay;

    function callClear() {
        if(callT) {
            clearTimeout(callT);
            callT = null;
        }
    }
    function callSet(overrideI) {
        callClear();
        callT = setTimeout(function () {
            callT = null;
            func();
        }, (overrideI !== undefined) ? overrideI : callI);
    }
    function callRun() {
        callClear();
        func();
    }
    return {
        clear: callClear,
        set: callSet,
        run: callRun
    };
}
var CELL_DEFS = {
    'brain': {
    },
    'lung': {
    },
    'liver': {
    },
    'muscle': {
    }
};
var CELL_KINDS = Object.keys(CELL_DEFS);
var CELL_REGIONS = {
    'head': [
        'brain'
    ],
    'torso': [
        'lung'
    ],
    'midsection': [
        'liver'
    ],
    'legs': [
        'muscle'
    ]
};
var CELL_BROADCAST = 500;
var CellProperties = (function () {
    function CellProperties(reproduce, apostosis) {
        if (typeof reproduce === "undefined") { reproduce = 5; }
        if (typeof apostosis === "undefined") { apostosis = 10; }
        this.reproduce = reproduce;
        this.apostosis = apostosis;
    }
    return CellProperties;
})();
var Cell = (function () {
    function Cell(kind) {
        this.kind = kind;
        var _this = this;
        this.$elem = $('<div class="cell"></div>').addClass(kind);
        this.$props = $('<div class="props"></div>').appendTo(this.$elem);
        this.row = this.col = 0;
        this.broadcastT = renewableTimeout($.proxy(this, 'broadcast'), CELL_BROADCAST);
        this.props = new CellProperties(Random.int(3, 8), Random.int(6, 15));
        Object.keys(this.props).forEach(function (prop) {
            var $prop = $('<div></div>').addClass('prop ' + prop);
            $prop.width(_this.props[prop]).height(_this.props[prop]);
            $prop.appendTo(_this.$props);
        });
    }
    Cell.prototype.addToGrid = function (grid, row, col) {
        var _this = this;
        this.grid = grid;
        this.row = row;
        this.col = col;
        this.gridPos = grid.name + '-' + row + 'x' + col;
        this.$elem.data('cell-row', row).data('cell-col', col);
        [
            row - 1, 
            row, 
            row + 1
        ].forEach(function (r) {
            [
                col - 1, 
                col, 
                col + 1
            ].forEach(function (c) {
                if(r === row && c === col) {
                    return;
                }
                var gridPos = grid.name + '-' + r + 'x' + c;
                Msg.sub('cell:vacant:' + gridPos, $.proxy(_this, 'request'));
            });
        });
    };
    Cell.prototype.birth = function () {
        Msg.pub('cell:birth', this);
        var deathTime = this.props.apostosis * 1000;
        this.deathT = new TWEEN.Tween({
            life: this.props.apostosis
        });
        this.deathT.to({
            life: 0
        }, deathTime).onComplete($.proxy(this, 'die'));
        this.deathT.start();
        if(this.kind === 'empty') {
            this.broadcastT.set();
        }
    };
    Cell.prototype.broadcast = function () {
        var _this = this;
        if(this.kind !== 'empty') {
            return;
        }
        var suitors = [];
        this.respond = function (cell) {
            suitors.push(cell);
        };
        Msg.pub('cell:vacant:' + this.gridPos, this);
        if(!suitors.length) {
            this.broadcastT.set();
            return;
        }
        suitors.sort(function (c1, c2) {
            return c1.props.reproduce - c2.props.reproduce;
        });
        var cloner = suitors[0];
        setTimeout(function () {
            return _this.become(cloner.kind);
        }, 150);
    };
    Cell.prototype.request = function (other) {
        if(this.kind === 'empty') {
            return;
        }
        other.respond(this);
    };
    Cell.prototype.die = function (reason, broadcast) {
        if (typeof broadcast === "undefined") { broadcast = true; }
        Msg.pub('cell:death', self, reason);
        this.kind = 'empty';
        this.$elem.removeClass(CELL_KINDS).addClass('empty');
        if(broadcast) {
            this.broadcastT.set();
        }
    };
    Cell.prototype.become = function (kind) {
        this.kind = kind;
        this.$elem.removeClass('empty').addClass(kind);
        this.birth();
    };
    return Cell;
})();
var CellGrid = (function () {
    function CellGrid(name, elem, cfg) {
        this.name = name;
        this.cells = [];
        this.rows = 1;
        this.cols = 1;
        this.$elem = $(elem);
        this.rows = Math.max(1, cfg.rows);
        this.cols = Math.max(1, cfg.cols);
        this.fill();
        var seedKind = CELL_REGIONS[name][0];
        this.seed(seedKind);
    }
    CellGrid.prototype.clear = function () {
        this.cells.forEach(function (cell) {
            cell.die('clear');
        });
    };
    CellGrid.prototype.fill = function (kind) {
        if (typeof kind === "undefined") { kind = 'empty'; }
        this.clear();
        for(var row = 0; row < this.rows; ++row) {
            for(var col = 0; col < this.cols; ++col) {
                var cell = new Cell(kind);
                cell.addToGrid(this, row, col);
                this.$elem.append(cell.$elem);
                this.cells.push(cell);
                cell.birth();
            }
        }
    };
    CellGrid.prototype.seed = function (kind) {
        var cell = this.cells[0];
        cell.die('seeding');
        cell.become(kind);
    };
    return CellGrid;
})();
var Body = (function () {
    function Body(elem, cfg) {
        var _this = this;
        this.grids = {
        };
        this.$elem = $(elem);
        this.$elem.find('section').each(function (i, v) {
            var grid = new CellGrid($(v).data('name'), $(v).find('.cells'), cfg);
            _this.grids[grid.name] = grid;
        });
    }
    return Body;
})();
var Game = (function () {
    function Game(elem, cfg) {
        this.$elem = $(elem);
        this.body = new Body(this.$elem.find('.body'), cfg);
        Msg.pub('game:init', this);
    }
    return Game;
})();
