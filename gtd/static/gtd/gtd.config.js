"use strict";

import 'angular';
import 'angular-route';
import 'angular-resource';
import 'angular-ui-calendar';

angular.module("orgwolf.gtd", ["orgwolf.tools", "orgwolf.weeklyReview",
			       "ngRoute", "ngResource", "ui.calendar"]);
