$(document).on('click', '[href^="#"]', function (e) {
    e.preventDefault();
    $.bbq.pushState($(this).attr('href'), 0);
});
$(function () {
    function hashchange(e) {
        var param = $.bbq.getState();
        var $regions = $('.regions section').removeClass('active');
        $regions.filter('.' + param.region).addClass('active');
        var $links = $('.map nav li').removeClass('active');
        $links.filter('.' + param.region).addClass('active');
    }
    $(window).bind('hashchange', hashchange) && hashchange();
});
