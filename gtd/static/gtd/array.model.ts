"use strict";

interface Array<T> {
    order_by(field: string): Array<T>;
}

Array.prototype.order_by = function(field: string) {
    // Accepts a string and orders according to
    // the field represented by that string.
    // '-field' reverses the order.
    var fields, sorted, compare, key, DATEFIELDS, direction;
    DATEFIELDS = ['opened', 'closed', 'scheduled_date', 'deadline_date'];
    fields = /^(-)?(\S*)$/.exec(field);
    key = fields[2];
    sorted = this.slice(0);
    // Determine forward or reverse sort
    if (fields[1] === '-') {
        direction = -1;
    } else {
        direction = 1;
    }
    compare = function(a, b) {
        var a_val, b_val, num_a, num_b, response;
        // Test whether key is in heading.fields
        if (a.fields === undefined || b.fields === undefined) {
            // Failsafe in case not using actual heading objects
            a_val = a[key];
            b_val = b[key];
        } else if (a.fields.hasOwnProperty(key) && b.fields.hasOwnProperty(key)) {
            a_val = a.fields[key];
            b_val = b.fields[key];
        } else {
            a_val = a[key];
            b_val = b[key];
        }
        num_a = Number(a_val);
        num_b = Number(b_val);
        // First check for new nodes
        if (a.pk === 0) {
            response = -1;
            direction = 1;
        } else if (b.pk === 0) {
            response = 1;
            direction = 1;
        } else if (DATEFIELDS.indexOf(key) > -1) {
            // Sorting by date
            response = new Date(a_val).getTime() - new Date(b_val).getTime();
        } else if (num_a && num_b) {
            // Sorting by number
            response = num_a - num_b;
        } else {
            // Sorting by alphabet
            if (typeof a_val !== 'string') {
                a_val = '';
            }
            if (typeof b_val !== 'string') {
                b_val = '';
            }
            a_val = a_val.toUpperCase();
            b_val = b_val.toUpperCase();
            if (a_val < b_val) {
                response = -1;
            } else if (a_val > b_val) {
                response = 1;
            } else {
                response = 0;
            }
        }
        return response * direction;
    };
    // Initiate sorting
    sorted.sort(compare);
    return sorted;
}; // end of order_by method
