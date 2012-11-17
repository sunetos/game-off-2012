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
        return items[int(0, items.length - 1)];
    }
    Random.choice = choice;
})(Random || (Random = {}));
function renewableTimeout(func, delay) {
    var callT = null, callI = delay;
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
var DNA = (function () {
    function DNA(reproduce, apoptosis, grow, enzyme1, enzyme2, misc1, misc2) {
        if (typeof reproduce === "undefined") { reproduce = 1; }
        if (typeof apoptosis === "undefined") { apoptosis = 1; }
        if (typeof grow === "undefined") { grow = 1; }
        if (typeof enzyme1 === "undefined") { enzyme1 = 1; }
        if (typeof enzyme2 === "undefined") { enzyme2 = 1; }
        if (typeof misc1 === "undefined") { misc1 = 1; }
        if (typeof misc2 === "undefined") { misc2 = 1; }
        this.reproduce = reproduce;
        this.apoptosis = apoptosis;
        this.grow = grow;
        this.enzyme1 = enzyme1;
        this.enzyme2 = enzyme2;
        this.misc1 = misc1;
        this.misc2 = misc2;
        this.code = '';
        this.ancestor = null;
        this.manager = null;
        this.props = [
            'reproduce', 
            'apoptosis', 
            'grow', 
            'enzyme1', 
            'enzyme2', 
            'misc1', 
            'misc2'
        ];
        this.buildCode();
    }
    DNA.prototype.buildCode = function () {
        var _this = this;
        this.props.forEach(function (prop) {
            _this.code += _this[prop].toString(2);
        });
    };
    DNA.prototype.copy = function (mutate) {
        if (typeof mutate === "undefined") { mutate = true; }
        var _this = this;
        var doMutate = Random.int(1, this.manager.mutateResist) === 1;
        if(!doMutate) {
            return this;
        }
        var copy = new DNA();
        copy.ancestor = this;
        copy.manager = this.manager;
        this.props.forEach(function (prop) {
            copy[prop] = _this[prop];
        });
        var mutateProps = [];
        var mutateCount = Random.int(1, this.manager.mutateCount);
        for(var i = 0; i < mutateCount; ++i) {
            var prop = Random.choice(this.props);
            while(mutateProps.indexOf(prop) !== -1) {
                prop = Random.choice(this.props);
            }
        }
        mutateProps.forEach(function (prop) {
            var amount = Random.int(1, _this.manager.mutateAmount);
            var dir = (Random.int(0, 1) - 1) | 1;
            copy[prop] = (copy[prop] + amount * dir) % 32;
        });
        copy.buildCode();
        return copy;
    };
    return DNA;
})();
var DNAManager = (function () {
    function DNAManager(root) {
        this.root = null;
        this.mutateResist = 20;
        this.mutateCount = 1;
        this.mutateAmount = 2;
        this.root = root || new DNA(Random.int(8, 12), Random.int(8, 12), Random.int(8, 12), Random.int(8, 12), Random.int(8, 12), Random.int(8, 12), Random.int(8, 12));
        this.root.manager = this;
    }
    return DNAManager;
})();
var CellProperties = (function () {
    function CellProperties(dna, reproduce, apoptosis, grow, enzyme1, enzyme2) {
        if (typeof reproduce === "undefined") { reproduce = 5; }
        if (typeof apoptosis === "undefined") { apoptosis = 16; }
        if (typeof grow === "undefined") { grow = 10; }
        if (typeof enzyme1 === "undefined") { enzyme1 = 16; }
        if (typeof enzyme2 === "undefined") { enzyme2 = 16; }
        this.dna = dna;
        this.reproduce = reproduce;
        this.apoptosis = apoptosis;
        this.grow = grow;
        this.enzyme1 = enzyme1;
        this.enzyme2 = enzyme2;
    }
    return CellProperties;
})();
var CELL_DEFS = {
    'brain': {
    },
    'colon': {
    },
    'eye': {
    },
    'lung': {
    },
    'heart': {
    },
    'liver': {
    },
    'muscle': {
    },
    'skin': {
    }
};
var CELL_KINDS = Object.keys(CELL_DEFS);
var CELL_REGIONS = {
    'head': [
        'brain', 
        'eye'
    ],
    'torso': [
        'lung', 
        'heart'
    ],
    'midsection': [
        'liver', 
        'colon'
    ],
    'legs': [
        'muscle', 
        'skin'
    ]
};
var CELL_BROADCAST = 500;
var Cell = (function () {
    function Cell(kind) {
        this.kind = kind;
        this.$elem = $('<div class="cell"></div>').addClass(kind);
        this.$props = $('<div class="props"></div>').appendTo(this.$elem);
        this.row = this.col = 0;
        this.broadcastT = renewableTimeout($.proxy(this, 'broadcast'), CELL_BROADCAST);
        var dna = new DNA();
        this.props = new CellProperties(dna, Random.int(3, 8), Random.int(10, 20));
        this.setPropElems();
    }
    Cell.prototype.setPropElems = function () {
        var _this = this;
        Object.keys(this.props).forEach(function (prop) {
            var $prop = _this.$elem.find('.prop.' + prop);
            if(!$prop.length) {
                $prop = $('<div></div>').addClass('prop ' + prop).appendTo(_this.$props);
            }
            $prop.height(_this.props[prop]);
        });
    };
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
        var deathTime = this.props.apoptosis * 1000;
        this.deathT = new TWEEN.Tween({
            life: this.props.apoptosis
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
        this.cloneFrom(cloner);
    };
    Cell.prototype.cloneFrom = function (cloner) {
        var _this = this;
        if(this.grid.isVisible()) {
            var $cloner = cloner.$elem, clonerElem = $cloner.get(0);
            var pos = this.$elem.position(), cpos = $cloner.position();
            var $clone = $cloner.clone().css({
                position: 'absolute',
                left: cpos.left,
                top: cpos.top
            }).appendTo($cloner.parent());
            $clone.animate({
                left: pos.left,
                top: pos.top
            }, 200, 'swing', function () {
                $clone.remove();
                _this.become(cloner.kind, cloner.props);
            });
        } else {
            setTimeout(function () {
                return _this.become(cloner.kind, cloner.props);
            }, 200);
        }
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
    Cell.prototype.become = function (kind, props) {
        this.kind = kind;
        if(props) {
            this.props = props;
            this.setPropElems();
        }
        this.$elem.removeClass('empty').addClass(kind);
        this.birth();
    };
    return Cell;
})();
var CellGrid = (function () {
    function CellGrid(region, index, name, elem, cfg) {
        this.region = region;
        this.index = index;
        this.name = name;
        this.cells = [];
        this.rows = 1;
        this.cols = 1;
        this.$elem = $(elem);
        this.rows = Math.max(1, cfg.rows);
        this.cols = Math.max(1, cfg.cols);
        this.fill();
        var seedKind = CELL_REGIONS[region.name][index];
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
    CellGrid.prototype.isVisible = function () {
        return this.region.isVisible();
    };
    return CellGrid;
})();
var BodyRegion = (function () {
    function BodyRegion(name, elem, cfg) {
        this.name = name;
        var _this = this;
        this.grids = {
        };
        this.$elem = $(elem);
        this.$elem.find('.grid').each(function (i, v) {
            var grid = new CellGrid(_this, i, $(v).data('name'), $(v).find('.cells'), cfg);
            _this.grids[grid.name] = grid;
        });
    }
    BodyRegion.prototype.isVisible = function () {
        return ($.bbq.getState('region') === this.name);
    };
    return BodyRegion;
})();
var Body = (function () {
    function Body(elem, cfg) {
        var _this = this;
        this.regions = {
        };
        this.$elem = $(elem);
        this.$elem.find('section').each(function (i, v) {
            var region = new BodyRegion($(v).data('name'), v, cfg);
            _this.regions[region.name] = region;
        });
    }
    return Body;
})();
var Game = (function () {
    function Game(elem, cfg) {
        this.$elem = $(elem);
        this.body = new Body(this.$elem.find('.body'), cfg);
        this.dnaMgr = new DNAManager();
        Msg.pub('game:init', this);
    }
    return Game;
})();
