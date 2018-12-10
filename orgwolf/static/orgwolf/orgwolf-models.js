"use strict"

/*************************************************
* Add a method to the Date object for exporting
* to standard string for dates
*************************************************/
Date.prototype.ow_date = function() {
    var s;
    s = this.getFullYear() + '-' + (this.getMonth()+1) + '-' + this.getDate();
    s = this.toISOString().slice(0, 10);
    return s;
};
