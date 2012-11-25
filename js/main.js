// Setup hashchange events and link interception.
$(document).on('click', '[href^="#"]', function(e) {
  e.preventDefault();
  $.bbq.pushState($(this).attr('href'), 0);
});

$(document).on('mouseenter mouseleave', '.cell, .cell-info', function(e) {
  var $target = $(this).data('target') || $(this);
  $target.trigger((e.type === 'mouseenter') ? 'show-info' : 'hide-info');
});

$(document).on('click', '.refresh', function(e) {
  document.location.reload();
});

jQuery.fn.extend({lightbox: function() {
  var $elem = this.addClass('lightbox');
  function remove() {
    $(document).off('keyup', keyup);
    $elem.remove();
  }
  function keyup(e) {
    if (e.keyCode === 27) remove();
  }
  $(document).on('keyup', keyup);
  $elem.on('click', '.close', remove).on('close', remove);
  return $elem;
}});

$(function() {
  //if ($.support.transition) $.fn.animate = $.fn.transition;

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
    $.fx.off = !game.visible;
  });

  function hashchange(e) {
    var param = $.bbq.getState();
    if (!param.region) {
      $.bbq.pushState({region: 'head'});
      return;
    }
    game.body.visibleRegion = param.region;
    $(['.body section', '.map nav li']).each(function(i, s) {
      $(s).removeClass('active').filter('.' + param.region).addClass('active');
    });
  }
  $(window).bind('hashchange', hashchange) && hashchange();
});
