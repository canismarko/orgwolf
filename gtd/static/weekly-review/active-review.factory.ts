import { module as ngModule } from "angular";

ngModule("orgwolf.weeklyReview")
    .factory("activeReview", activeReview);


activeReview.$inject = ["WeeklyReview"];


function activeReview(WeeklyReview) {
    let review = new WeeklyReview(true);
    review.query();
    // Load the open review from the server
    return review;
}
