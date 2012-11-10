$(document).on('click', '[href^="#"]', function (e) {
    e.preventDefault();
    $.bbq.pushState($(this).attr('href'), 0);
});
$(function () {
    Msg.sub('game:init', function () {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            args[_i] = arguments[_i + 0];
        }
        console.log('game:init');
        console.log(args);
    });
    window.game = new Game('#game', {
        rows: 8,
        cols: 10
    });
    function hashchange(e) {
        var param = $.bbq.getState();
        [
            '.body section', 
            '.map nav li'
        ].forEach(function (s) {
            $(s).removeClass('active').filter('.' + param.region).addClass('active');
        });
    }
    $(window).bind('hashchange', hashchange) && hashchange();
});
