import "angular";
import "angular-mocks";

describe('the "asHtml" filter', function() {
    var asHtmlFilter;
    beforeEach(angular.mock.module('orgwolf'))
    beforeEach(inject(function(_asHtmlFilter_) {
    	asHtmlFilter = _asHtmlFilter_;
    }));
    it('converts markdown to HTML', function() {
	var markdown, html;
	markdown = '# Hello';
	html = asHtmlFilter(markdown);
	expect(html.toString()).toEqual('<h1 id="hello">Hello</h1>');
    });
});
