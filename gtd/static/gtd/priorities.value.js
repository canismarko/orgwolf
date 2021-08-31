"use strict";

import "angular";

var priorities = [
    /*************************************************
     * Descriptions of A/B/C style priorities
     **************************************************/
    {sym: 'A', display: 'A - Critical'},
    {sym: 'B', display: 'B - High'},
    {sym: 'C', display: 'C - Default'}
];

angular.module("orgwolf.gtd")
    .value('priorities', priorities);
