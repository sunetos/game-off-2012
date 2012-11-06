$(document).on('click', '[href^="#"]', function (e) {
    e.preventDefault();
    $.bbq.pushState($(this).attr('href'), 0);
});
$(function () {
    function hashchange(e) {
        var param = $.bbq.getState();
        console.log(param);
    }
    $(window).bind('hashchange', hashchange) && hashchange();
});
