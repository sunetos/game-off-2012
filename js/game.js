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
    return Cell;
})();
var CellGrid = (function () {
    function CellGrid(name, elem, cfg) {
        this.name = name;
        this.rows = 1;
        this.cols = 1;
        this.$elem = $(elem);
        this.rows = cfg.rows || 1;
        this.cols = cfg.cols || 1;
        this.fillGrid();
    }
    CellGrid.prototype.fillGrid = function () {
        for(var row = 0; row < this.rows; ++row) {
            for(var col = 0; col < this.cols; ++col) {
                var cell = new Cell('empty');
                cell.setPos(row, col);
                this.$elem.append(cell.$elem);
            }
        }
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
