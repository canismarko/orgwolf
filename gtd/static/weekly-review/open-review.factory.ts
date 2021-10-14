import { module as ngModule } from "angular";

ngModule("orgwolf.weeklyReview")
    .factory("openReview", openReview);


openReview.$inject = ["WeeklyReview"];


function openReview(WeeklyReview) {
    let review = new WeeklyReview(false);
    review.query();
    // Load the open review from the server
    return review;
}
