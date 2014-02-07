// Jasmine tests for Getting Things Done javascript (mostly angular)
describe('angular color filter', function() {
    beforeEach(module('owFilters'));
    it('sets todo_state color', inject(function(styleFilter) {
	obj = {
	    model: 'gtd.todostate',
	    fields: {
		_color_rgb: 0,
		_color_alpha: 0,
	    }
	};
    	expect(styleFilter(obj)).toEqual('color: rgba(0, 0, 0, 0); ');
    }));
});
