"use strict";

import { module as ngModule } from "angular";

var priorities = [
    /*************************************************
     * Descriptions of A/B/C style priorities
     **************************************************/
    { sym: 'A', display: 'A - Critical' },
    { sym: 'B', display: 'B - High' },
    { sym: 'C', display: 'C - Default' }
];

ngModule("orgwolf.gtd")
    .value('priorities', priorities);
