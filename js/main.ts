/// <reference path="libs/jquery.bbq.d.ts" />

$(document).on('click', '[href^="#"]', function(e) {
  e.preventDefault();
  $.bbq.pushState($(this).attr('href'), 0);
});

$(function() {
  function hashchange(e?) {
    var param = $.bbq.getState();
  }
  $(window).bind('hashchange', hashchange) && hashchange();
});
