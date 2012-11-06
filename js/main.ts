/// <reference path="libs/jquery.bbq.d.ts" />

$(function() {
  $.bbq.pushState({'foo': 'bar'});
  console.log($.bbq.getState());
  console.log($.param({testing: '123'}));
  console.log($.param.querystring('/', {testing: '123'}));
  console.log($.param.fragment('/', {testing: '123'}));
  console.log($.deparam.fragment());
  console.log($('body:first').fragment('class', {testing: '123'}));
});
