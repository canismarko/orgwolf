"use strict";

import "angular";
import "angular-mocks";

describe('the owWaitIndicator service', function() {
    var waiting, $rootScope, waitIndicator;
    beforeEach(angular.mock.module('orgwolf.tools'));
    beforeEach(inject(function($injector) {
	waitIndicator = $injector.get('owWaitIndicator');
	$rootScope = $injector.get('$rootScope');
    }));
    it('adds a new short wait period to the list', function() {
	waitIndicator.start_wait('quick', 'test');
	expect(waitIndicator.waitLists['quick'].length).toEqual(1);
    });
    it('clears a short wait period from the list', function() {
	// Add two similar waiting periods...
	waitIndicator.start_wait('quick', 'tests');
	waitIndicator.start_wait('quick', 'tests');
	// ...then remove them
	waitIndicator.end_wait('quick', 'tests');
	expect(waitIndicator.waitLists['quick'].length).toEqual(0);
    });
    it('adds a new medium wait period to the list', function() {
	waitIndicator.start_wait('medium', 'test');
	expect(waitIndicator.waitLists['medium'].length).toEqual(1);
    });
    it('clears a medium wait period from the list', function() {
	// Add two similar waiting periods...
	waitIndicator.start_wait('medium', 'tests');
	waitIndicator.start_wait('medium', 'tests');
	// ...then remove them
	waitIndicator.end_wait('medium', 'tests');
	expect(waitIndicator.waitLists['medium'].length).toEqual(0);
    });
    it('clears all wait lists if no duration is given', function() {
	waitIndicator.start_wait('quick', 'tests');
	waitIndicator.start_wait('medium', 'tests');
	waitIndicator.end_wait('tests');
	expect(waitIndicator.waitLists['quick'].length).toEqual(0);
	expect(waitIndicator.waitLists['medium'].length).toEqual(0);
    });
});
