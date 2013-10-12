// Holds backbone models related to the Getting Things Done portion of the app
var TodoState = Backbone.Model.extend({
    initialize: function() {
	// Constructer for TodoState model
	alert('hello, TodoState');
    }
});

var GtdHeading = Backbone.Model.extend({
    initialize: function() {
	// Constructor for GtdHeading model
	alert('hello, GtdHeading');
    }
});
