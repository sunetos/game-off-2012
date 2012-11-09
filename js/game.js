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
var CELL_KINDS = 'brain lung liver muscle';
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
var Cell = (function () {
    function Cell(kind) {
        this.kind = kind;
        this.$elem = $('<div class="cell"></div>').addClass(kind);
        this.row = this.col = 0;
    }
    Cell.prototype.setPos = function (row, col) {
        this.row = row;
        this.col = col;
        this.$elem.data('cell-row', row).data('cell-col', col);
    };
    Cell.prototype.birth = function () {
        Msg.off('cell-vacant', self.request);
        Msg.pub('cell-birth', self);
        Msg.sub('cell-vacant', self.request);
    };
    Cell.prototype.request = function () {
    };
    Cell.prototype.die = function (reason, broadcast) {
        if (typeof broadcast === "undefined") { broadcast = 0; }
        var _this = this;
        Msg.pub('cell-death', self, reason);
        this.$elem.removeClass(CELL_KINDS).addClass('empty');
        if(broadcast) {
            this.bcastI = setInterval(function () {
                Msg.pub('cell-vacant', _this);
            }, broadcast);
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
                cell.setPos(row, col);
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
        Msg.pub('game-init', this);
    }
    return Game;
})();
