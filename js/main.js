// Setup hashchange events and link interception.
$(document).on('click', '[href^="#"]', function(e) {
  e.preventDefault();
  $.bbq.pushState($(this).attr('href'), 0);
});

$(function() {
  Msg.sub('game:init', function() {
    console.log('game:init');
  });
  window.game = new Game('#game', {rows: 8, cols: 10});

  function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
  }
  animate();

  function hashchange(e) {
    var param = $.bbq.getState();
    $(['.body section', '.map nav li']).each(function(i, s) {
      $(s).removeClass('active').filter('.' + param.region).addClass('active');
    });
  }
  $(window).bind('hashchange', hashchange) && hashchange();
});
