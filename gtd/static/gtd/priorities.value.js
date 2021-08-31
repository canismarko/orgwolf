"use strict";

import "angular";

angular.module("orgwolf.gtd")
    .value('priorities', priorities);

var priorities = [
    /*************************************************
     * Descriptions of A/B/C style priorities
     **************************************************/
    {sym: 'A', display: 'A - Critical'},
    {sym: 'B', display: 'B - High'},
    {sym: 'C', display: 'C - Default'}
];
