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
  Msg.subscribe('game-init', function(...args: any[]) {
    console.log('game-init');
    console.log(args);
  });
  window.game = new Game('#game');

  function hashchange(e?) {
    var param = $.bbq.getState();
    ['.regions section', '.map nav li'].forEach((s) => {
      $(s).removeClass('active').filter('.' + param.region).addClass('active');
    });
  }
  $(window).bind('hashchange', hashchange) && hashchange();
});
