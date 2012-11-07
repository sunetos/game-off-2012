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
        this.$elem = $('<div class="cell"></div>');
    }
    return Cell;
})();
var CellGrid = (function () {
    function CellGrid(name, elem) {
        this.name = name;
        this.$elem = $(elem);
    }
    return CellGrid;
})();
var Body = (function () {
    function Body(elem) {
        var _this = this;
        this.grids = {
        };
        this.$elem = $(elem);
        this.$elem.find('section').each(function (i, v) {
            var grid = new CellGrid($(v).data('name'), v);
            _this.grids[grid.name] = grid;
        });
    }
    return Body;
})();
var Game = (function () {
    function Game(elem) {
        this.$elem = $(elem);
        this.body = new Body(this.$elem.find('.body'));
        Msg.pub('game-init', this);
    }
    return Game;
})();
$(document).on('click', '[href^="#"]', function (e) {
    e.preventDefault();
    $.bbq.pushState($(this).attr('href'), 0);
});
$(function () {
    Msg.sub('game-init', function () {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            args[_i] = arguments[_i + 0];
        }
        console.log('game-init');
        console.log(args);
    });
    window.game = new Game('#game');
    function hashchange(e) {
        var param = $.bbq.getState();
        [
            '.regions section', 
            '.map nav li'
        ].forEach(function (s) {
            $(s).removeClass('active').filter('.' + param.region).addClass('active');
        });
    }
    $(window).bind('hashchange', hashchange) && hashchange();
});
