// Setup hashchange events and link interception.
$(document).on('click', '[href^="#"]', function(e) {
  e.preventDefault();
  $.bbq.pushState($(this).attr('href'), 0);
});

$(function() {
  Msg.sub('game:init', function() {
    console.log('game:init');
  });
  window.game = new Game('#game', {rows: 6, cols: 6});

  function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
  }
  animate();

  visibly.visibilitychange(function(state) {
    console.log('The current visibility state is:' + state);
    game.visible = (state === 'visible');
  });

  function hashchange(e) {
    var param = $.bbq.getState();
    $(['.body section', '.map nav li']).each(function(i, s) {
      $(s).removeClass('active').filter('.' + param.region).addClass('active');
    });
  }
  $(window).bind('hashchange', hashchange) && hashchange();
});
