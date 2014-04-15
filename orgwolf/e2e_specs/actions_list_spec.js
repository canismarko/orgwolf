var ActionsPage = function() {
    var that = this;
    this.get = function() {
	browser.get('http://localhost:8000/gtd/actions');
    };
    this.getContextBox = function() {
	return element(by.model('activeContext'));
    };
    this.getContextOption = function(contextId) {
	var elem;
	if (contextId) {
	    elem = that.getContextBox().$('[value="' + contextId + '"');
	} else {
	    elem = that.getContextBox().$('option:first-child');
	}
	return elem;
    };
};

describe('the GTD actions list page', function() {
    var actionsPage;
    beforeEach(function() {
	actionsPage = new ActionsPage();
    });
    it('updates the navbar link on context change', function() {
	var navButton;
	actionsPage.get();
	actionsPage.getContextBox().click();
	actionsPage.getContextOption(1).click();
	navButton = element(by.id('nav-actions'));
	expect(navButton.$('a:nth-child(2)').getText()).toEqual('House Actions');
	expect(navButton.$('a').getAttribute('href'))
	    .toContain('/gtd/actions/2/house');
	browser.driver.navigate().refresh();
	navButton = element(by.id('nav-actions'));
	expect(navButton.$('a:nth-child(2)').getText()).toEqual('House Actions');
	// Reset back to no context
	actionsPage.getContextBox().click();
	actionsPage.getContextOption(null).click();
	navButton = element(by.id('nav-actions'));
	expect(navButton.$('a:nth-child(1)').getText()).toEqual('Next Actions');
    });
});
