/// <reference path="libs/jquery.bbq.d.ts" />
/// <reference path="game.ts" />

// Setup hashchange events and link interception.
$(document).on('click', '[href^="#"]', function(e) {
  e.preventDefault();
  $.bbq.pushState($(this).attr('href'), 0);
});

// Start the actual game.
interface Window {
  game: Game;
}

$(function() {
  Msg.sub('game:init', function(...args: any[]) {
    console.log('game:init');
    console.log(args);
  });
  window.game = new Game('#game', {rows: 8, cols: 10});

  function hashchange(e?) {
    var param = $.bbq.getState();
    ['.body section', '.map nav li'].forEach((s) => {
      $(s).removeClass('active').filter('.' + param.region).addClass('active');
    });
  }
  $(window).bind('hashchange', hashchange) && hashchange();
});
