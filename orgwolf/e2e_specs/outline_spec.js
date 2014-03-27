var OutlinePage = function() {
    this.get = function() {
	browser.get('http://localhost:8000/gtd/project/');
    };
    this.getTwisty = function() {
	return element(by.repeater('heading in children').row(0));
    };
};
describe('the GTD outline page', function() {
    var outlinePage;
    beforeEach(function() {
	// Create the outline page object
	outlinePage = new OutlinePage();
    });
    it('toggles among all three states', function() {
    	outlinePage.get();
    	var firstRow = outlinePage.getTwisty();
    	expect(firstRow.getAttribute('class')).toMatch(/heading/);
    	expect(firstRow.getAttribute('class')).toMatch(/state-0/);
    	// Click to toggle
    	firstRow.findElement(by.className('ow-hoverable')).click();
    	expect(firstRow.getAttribute('class')).toMatch(/state-1/);
    	firstRow.findElement(by.className('ow-hoverable')).click();
    	expect(firstRow.getAttribute('class')).toMatch(/state-2/);
    	firstRow.findElement(by.className('ow-hoverable')).click();
    	expect(firstRow.getAttribute('class')).toMatch(/state-0/);
    });
    it('lets the user edit a heading', function() {
    	outlinePage.get();
    	var firstRow = outlinePage.getTwisty();
    	var editButton = firstRow.findElement(by.css('.edit-icon'));
	editButton.click();
	var titleBox = element(by.model('fields.title'));
	var oldText = titleBox.getAttribute('value');
	console.log(oldText);
	titleBox.sendKeys(' extra text');
	$('.save-btn').click();
	expect(firstRow.$('.ow-title').getText()).toMatch(/extra text$/);
	// Now set it back to its original values
	editButton.click();
	titleBox = element(by.model('fields.title'));
	titleBox.clear();
	titleBox.sendKeys(oldText);
	$('.save-btn').click();
	expect(firstRow.$('.ow-title').getText()).toEqual(oldText);
    });
});
