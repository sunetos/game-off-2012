var TEA;
(function (TEA) {
    function code(v, k) {
        var n = v.length;
        var z = v[n - 1], y = v[0], delta = 2654435769;
        var mx, e, q = Math.floor(6 + 52 / n), sum = 0;
        while(q-- > 0) {
            sum += delta;
            e = sum >>> 2 & 3;
            for(var p = 0; p < n; p++) {
                y = v[(p + 1) % n];
                mx = (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z);
                z = v[p] += mx;
            }
        }
    }
    function decode(v, k) {
        var n = v.length;
        var z = v[n - 1], y = v[0], delta = 2654435769;
        var mx, e, q = Math.floor(6 + 52 / n), sum = q * delta;
        while(sum != 0) {
            e = sum >>> 2 & 3;
            for(var p = n - 1; p >= 0; p--) {
                z = v[p > 0 ? p - 1 : n - 1];
                mx = (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z);
                y = v[p] -= mx;
            }
            sum -= delta;
        }
    }
    function int2bin(num) {
        var temp = -1 >>> 1;
        var arr = new Array(32);
        for(var i = 31; i >= 0; --i) {
            arr[i] = (num & 1);
            num = num >>> 1;
        }
        return arr.join('');
    }
    TEA.int2bin = int2bin;
    function bin2int(bin) {
        var val = parseInt(bin, 2), neg = bin[0] === '1';
        return (neg) ? ~(~val + 1) + 1 : val;
    }
    TEA.bin2int = bin2int;
    function randomU32() {
        return (Math.random() * (-1 >>> 0)) >>> 0;
    }
    function randomKey() {
        return [
            randomU32(), 
            randomU32(), 
            randomU32(), 
            randomU32()
        ];
    }
    TEA.randomKey = randomKey;
    function wrap64b(func, key, bin) {
        var first = bin.slice(-64, -32), last = bin.slice(-32);
        var v = [
            bin2int(first), 
            bin2int(last)
        ];
        func(v, key);
        return int2bin(v[0]) + int2bin(v[1]);
    }
    function encrypt64b(key, bin) {
        return wrap64b(code, key, bin);
    }
    TEA.encrypt64b = encrypt64b;
    function decrypt64b(key, bin) {
        return wrap64b(decode, key, bin);
    }
    TEA.decrypt64b = decrypt64b;
})(TEA || (TEA = {}));
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
    function scale(scale) {
        if (typeof scale === "undefined") { scale = 1; }
        return Math.random() * scale;
    }
    Random.scale = scale;
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
var KeyManager = (function () {
    function KeyManager(key) {
        this.key = key || TEA.randomKey();
    }
    return KeyManager;
})();
var keyMgr = new KeyManager();
var DNA = (function () {
    function DNA(reproduce, apoptosis, grow, enzyme1, enzyme2, misc1) {
        if (typeof reproduce === "undefined") { reproduce = 1; }
        if (typeof apoptosis === "undefined") { apoptosis = 1; }
        if (typeof grow === "undefined") { grow = 1; }
        if (typeof enzyme1 === "undefined") { enzyme1 = 1; }
        if (typeof enzyme2 === "undefined") { enzyme2 = 1; }
        if (typeof misc1 === "undefined") { misc1 = 1; }
        this.reproduce = reproduce;
        this.apoptosis = apoptosis;
        this.grow = grow;
        this.enzyme1 = enzyme1;
        this.enzyme2 = enzyme2;
        this.misc1 = misc1;
        this.code = '';
        this.encoded = '';
        this.ancestor = null;
        this.manager = null;
        this.props = [
            'reproduce', 
            'apoptosis', 
            'grow', 
            'enzyme1', 
            'enzyme2', 
            'misc1'
        ];
        this.buildCode();
    }
    DNA.prototype.buildCode = function () {
        var _this = this;
        var val = 0;
        this.props.forEach(function (prop, i) {
            val |= _this[prop] << (i << 2);
        });
        this.code = TEA.int2bin(val);
        this.encoded = TEA.encrypt64b(keyMgr.key, this.code);
    };
    DNA.prototype.copy = function (mutate) {
        if (typeof mutate === "undefined") { mutate = true; }
        var _this = this;
        var doMutate = mutate || Random.int(1, this.manager.mutateResist) === 1;
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
var DNADisplay = (function () {
    function DNADisplay(dna) {
        this.dna = dna;
        this.$elem = $('<div class="dna"></div>');
        for(var i = 0; i < dna.encoded.length; ++i) {
            var cls = (dna.encoded[i] | 0) ? 'one' : 'zero';
            this.$elem.append($('<div></div>').addClass(cls));
        }
    }
    return DNADisplay;
})();
var DNAManager = (function () {
    function DNAManager(root) {
        this.root = null;
        this.mutateResist = 20;
        this.mutateCount = 1;
        this.mutateAmount = 2;
        this.root = root || new DNA(10, 10, 10, 10, 10, 10);
        this.root.manager = this;
    }
    return DNAManager;
})();
var CellProperties = (function () {
    function CellProperties(reproduce, apoptosis, grow, enzyme1, enzyme2) {
        if (typeof reproduce === "undefined") { reproduce = 5; }
        if (typeof apoptosis === "undefined") { apoptosis = 16; }
        if (typeof grow === "undefined") { grow = 10; }
        if (typeof enzyme1 === "undefined") { enzyme1 = 16; }
        if (typeof enzyme2 === "undefined") { enzyme2 = 16; }
        this.reproduce = reproduce;
        this.apoptosis = apoptosis;
        this.grow = grow;
        this.enzyme1 = enzyme1;
        this.enzyme2 = enzyme2;
    }
    CellProperties.prototype.copy = function () {
        var _this = this;
        var props = new CellProperties();
        Object.keys(this).forEach(function (prop) {
            props[prop] = (_this[prop]['copy']) ? _this[prop].copy() : _this[prop];
        });
        return props;
    };
    CellProperties.prototype.scale = function (props) {
        var _this = this;
        Object.keys(this).forEach(function (prop) {
            _this[prop] = (_this[prop] * props[prop]) | 0;
        });
    };
    return CellProperties;
})();
var CELL_DEFS = {
    'bone': {
        props: new CellProperties(1, 1.5, 1, 1, 1),
        enzymes: []
    },
    'brain': {
        props: new CellProperties(1, 10, 2, 1, 1)
    },
    'colon': {
        props: new CellProperties(1, 2, 1, 1, 1)
    },
    'eye': {
        props: new CellProperties(1, 4, 1, 1, 1)
    },
    'lung': {
        props: new CellProperties(1, 4, 1, 1, 1)
    },
    'heart': {
        props: new CellProperties(1, 3, 1, 1, 1)
    },
    'liver': {
        props: new CellProperties(1, 3, 1, 1, 1)
    },
    'muscle': {
        props: new CellProperties(1, 5, 1, 1, 1)
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
        'bone'
    ]
};
var CELL_BROADCAST = 500;
var FULL_W = 40, FULL_H = 40;
var EMPTY_W = 5, EMPTY_H = 5;
var Cell = (function () {
    function Cell(dna, kind) {
        this.dna = dna;
        this.kind = kind;
        this.$elem = $('<div class="cell"></div>').addClass(kind);
        this.row = this.col = 0;
        this.broadcastT = renewableTimeout($.proxy(this, 'broadcast'), CELL_BROADCAST);
        if(kind === 'empty') {
            this.props = new CellProperties();
        } else {
            this.props = CELL_DEFS[kind].props.copy();
            this.props.scale(dna);
        }
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
    Cell.prototype.birth = function (fastForward) {
        var lifeSec = this.props.apoptosis, skipSec = 0;
        if(fastForward) {
            skipSec = lifeSec * fastForward;
            lifeSec -= skipSec;
        }
        var lifeMs = lifeSec * 1000;
        this.deathT = new TWEEN.Tween({
            life: this.props.apoptosis
        });
        this.deathT.to({
            life: 0
        }, lifeMs).onComplete($.proxy(this, 'die'));
        this.deathT.start();
        var growSec = this.props.grow;
        if(skipSec > growSec) {
            this.$elem.width(FULL_W).height(FULL_H);
        } else {
            growSec -= skipSec;
            var growMs = growSec * 1000;
            this.$elem.width(EMPTY_W).height(EMPTY_H).animate({
                width: FULL_W,
                height: FULL_H
            }, growMs, 'linear');
        }
        if(this.kind === 'empty') {
            this.broadcastT.set();
        }
        Msg.pub('cell:birth', this);
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
        var cell = suitors[0];
        this.cloneFrom(cell);
    };
    Cell.prototype.cloneFrom = function (cell) {
        var _this = this;
        var kind = cell.kind, dna = cell.dna;
        if(this.grid.visible) {
            var $cell = cell.$elem, cellElem = $cell.get(0);
            var pos = this.$elem.position(), cpos = $cell.position();
            var $clone = $cell.clone().css({
                position: 'absolute',
                left: cpos.left,
                top: cpos.top
            }).appendTo($cell.parent());
            $clone.animate({
                left: pos.left,
                top: pos.top,
                width: EMPTY_W,
                height: EMPTY_H
            }, 500, 'swing', function () {
                $clone.remove();
                _this.become(kind, dna);
            });
        } else {
            setTimeout(function () {
                return _this.become(kind, dna);
            }, 500);
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
        this.$elem.removeClass(CELL_KINDS).addClass('empty').width(EMPTY_W).height(EMPTY_H);
        if(broadcast) {
            this.broadcastT.set();
        }
    };
    Cell.prototype.become = function (kind, dna) {
        this.kind = kind;
        if(dna) {
            this.dna = dna.copy();
        }
        this.props = CELL_DEFS[kind].props.copy();
        this.props.scale(dna);
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
        this.$table = $('<table></table>').appendTo(this.$elem);
        this.rows = Math.max(1, cfg.rows);
        this.cols = Math.max(1, cfg.cols);
        var seedKind = CELL_REGIONS[region.name][index];
        this.fill(cfg.rootDna, seedKind);
    }
    CellGrid.prototype.clear = function () {
        this.cells.forEach(function (cell) {
            cell.die('clear');
        });
        this.$table.empty();
    };
    CellGrid.prototype.fill = function (dna, kind) {
        if (typeof kind === "undefined") { kind = 'empty'; }
        this.clear();
        for(var row = 0; row < this.rows; ++row) {
            var $row = $('<tr></tr>').appendTo(this.$table);
            for(var col = 0; col < this.cols; ++col) {
                var $col = $('<td></td>').appendTo($row);
                var cell = new Cell(dna, kind);
                cell.addToGrid(this, row, col);
                $col.append(cell.$elem);
                this.cells.push(cell);
                var fastFwd = Random.scale(0.8);
                cell.birth(fastFwd);
            }
        }
    };
    CellGrid.prototype.seed = function (kind) {
        var cell = this.cells[0];
        cell.die('seeding');
        cell.become(kind);
    };
    Object.defineProperty(CellGrid.prototype, "visible", {
        get: function () {
            return this.region.visible;
        },
        enumerable: true,
        configurable: true
    });
    return CellGrid;
})();
var BodyRegion = (function () {
    function BodyRegion(body, name, elem, cfg) {
        this.body = body;
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
    Object.defineProperty(BodyRegion.prototype, "visible", {
        get: function () {
            return (this.body.visible && $.bbq.getState('region') === this.name);
        },
        enumerable: true,
        configurable: true
    });
    return BodyRegion;
})();
var Body = (function () {
    function Body(game, elem, cfg) {
        this.game = game;
        var _this = this;
        this.regions = {
        };
        this.$elem = $(elem);
        this.$elem.find('section').each(function (i, v) {
            var region = new BodyRegion(_this, $(v).data('name'), v, cfg);
            _this.regions[region.name] = region;
        });
    }
    Object.defineProperty(Body.prototype, "visible", {
        get: function () {
            return this.game.visible;
        },
        enumerable: true,
        configurable: true
    });
    return Body;
})();
var Game = (function () {
    function Game(elem, cfg) {
        this.$elem = $(elem);
        this.visible = true;
        this.dnaMgr = new DNAManager();
        cfg.rootDna = this.dnaMgr.root;
        this.body = new Body(this, this.$elem.find('.body'), cfg);
        Msg.pub('game:init', this);
    }
    return Game;
})();
