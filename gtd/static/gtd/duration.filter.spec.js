"use strict";

import "angular";
import "angular-mocks";

describe('the duration filter', function() {
    var durationFilter, node;
    beforeEach(angular.mock.module('orgwolf.gtd'))
    beforeEach(inject(function(_durationFilter_) {
	durationFilter = _durationFilter_;
    }));
    it('handles day-specific nodes', function() {
	node = {
	    scheduled_date: "2014-06-16",
	    end_date: "2014-06-18"
	}
	expect(durationFilter(node)).toEqual("2 days");
    });
    it('handles time-specific nodes', function() {
	node = {
	    scheduled_date: "2014-06-16",
	    scheduled_time: "17:15",
	    end_date: "2014-06-16",
	    end_time: "18:00",
	}
	expect(durationFilter(node)).toEqual("45 minutes");
    });
    it('handles complex time intervals', function() {
	node = {
	    scheduled_date: "2014-06-16",
	    scheduled_time: "17:15",
	    end_date: "2014-06-18",
	    end_time: "19:00",
	}
	expect(durationFilter(node)).toEqual("2 days, 1 hour, 45 minutes");
    });
});
