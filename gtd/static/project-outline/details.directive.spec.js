describe('the owDetails directive', function() {
    beforeEach(angular.mock.module('owDirectives', 'owFilters', 'owServices'));
    beforeEach(inject(function(Heading) {
    	$templateCache.put('/static/details.html',
    	    		   '<div class="details"></div>');
    	heading = {
    	    id: 2,
    	    title: 'Hello, world',
	    focus_areas: [1, 2]
    	};
	$httpBackend.whenGET('/gtd/nodes/2?').respond(200, heading);
	$httpBackend.whenGET('/gtd/focusareas?is_visible=true').respond(200, [
	    {id: 1, display: 'Work'},
	    {id: 2, display: 'Home'}
	]);
	$rootScope.heading = Heading.get({id: 2});
	$httpBackend.flush();
    	element = $compile(
    	    '<div ow-details ow-heading="heading"></div>'
    	)($rootScope);
	$httpBackend.flush();
    }));
    it("has no tests written");
});
