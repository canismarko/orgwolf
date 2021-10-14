import "angular";
import "angular-mocks";

describe('the "decodeHtml" filter', function() {
    var decodeHtmlFilter;
    beforeEach(angular.mock.module('orgwolf.tools'))
    beforeEach(inject(function(_decodeHtmlFilter_) {
    	decodeHtmlFilter = _decodeHtmlFilter_;
    }));
    it('converts basic entities to real characters', function() {
	expect(decodeHtmlFilter('&lt;')).toEqual('<');
    });
});
