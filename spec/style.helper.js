var styles = ["../stylesheets/jscoverage.css"];
require(['underscore','jquery'], function(_, $){
  _.each(styles, function(url){
    var style = $('<link href="' + url + '" rel="stylesheet"></link>');
    style.prependTo('head');
  })
});