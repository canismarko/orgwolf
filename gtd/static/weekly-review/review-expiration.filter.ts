import {module as ngModule} from "angular";


ngModule("orgwolf.weeklyReview")
    .filter("reviewExpiration", reviewExpiration);

reviewExpiration.$inject = ['$filter'];


function reviewExpiration($filter) {
    return function(expiration_: string, today: Date) {
	let dateFilter, dateString, days: number, dayString: string, expiration: Date, isDate: boolean;
	// Default value for today
	if ( typeof today === 'undefined' ) {
	    today = new Date();
	}
	// Determine the formatted date string
	isDate = (typeof(expiration_) !== "undefined" && expiration_ !== null);
	if (!isDate) {
	    dateString = "never";
	} else {
	    expiration = new Date(expiration_);
	    dateFilter = $filter('date');
	    dateString = dateFilter(expiration, 'EEE yyyy-MM-dd HH:mm');
	    // Add the number of days left
	    console.log(expiration, today);
	    days = Math.round((expiration.getTime() - today.getTime()) / 24 / 60 / 60 / 1000);
	    if (days === 0) {
		// Today
		dayString = "today";
	    } else if (days < 0) {
		// In the past
		dayString = `${Math.abs(days)} day${days !== -1 ? 's' : ''} ago`;
	    } else {
		// In the future
		dayString = `in ${days} day${days !== 1 ? 's' : ''}`;
	    }
	    dateString += ` (${dayString})`;
	}
	return dateString;
    };
}


