import { module as ngModule } from "angular";


var weeklyReview = {
    templateUrl: "/static/weekly-review.html",
    controller: "weeklyReview",
};

ngModule('orgwolf.weeklyReview')
    .component("owWeeklyReview", weeklyReview);

