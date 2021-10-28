// import {jasmine} from "jasmine";
import * as angular from "angular";
import "angular-mocks";

describe('the weeklyReview factory object', function() {
    // var $scope, $rootScope, $httpBackend, $controller, $templateCache, activeReview, pendingReview;
    let weeklyReview, WeeklyReview, $httpBackend, $templateCache, pendingReview, reviewBackend;
    beforeEach(angular.mock.module("orgwolf.weeklyReview"));
    beforeEach(angular.mock.inject(function($injector) {
        WeeklyReview = $injector.get("WeeklyReview")
        $httpBackend = $injector.get("$httpBackend");
        $templateCache = $injector.get("$templateCache");
    }));
    beforeEach(function() {
        weeklyReview = new WeeklyReview();
        pendingReview = {
            id: 2,
            finalized: null,
            is_active: true,
            extra_tasks: [13],
            primary_tasks: [14],
            secondary_tasks: [15],
            tertiary_tasks: [16],
        };
        reviewBackend = $httpBackend.whenGET("/gtd/weeklyreviews/openreview/")
        reviewBackend.respond(pendingReview);
        $templateCache.put("/static/project-outline.html", "");
    });
    it("loads the review with no finalized date", function() {
        weeklyReview.query();
        $httpBackend.flush();
        expect(weeklyReview.obj.id).toEqual(pendingReview.id);
        expect(weeklyReview.isOpen).toBeTruthy();
    });
    it("is null when no pending reviews are found", function() {
        reviewBackend.respond(204, "");
        weeklyReview.query();
        $httpBackend.flush();
        expect(weeklyReview.obj).toEqual(null);
        expect(weeklyReview.isOpen).toBeFalsy();
    });
    describe("the *addTask* method", function() {
        it("adds nodes to the list of unprocessed tasks", function() {
            weeklyReview.query();
            $httpBackend.flush();
            expect(weeklyReview.obj.extra_tasks).not.toContain(27);
            $httpBackend.expectPUT("/gtd/weeklyreviews/2").respond(weeklyReview.obj);
            weeklyReview.addTask(27);
            expect(weeklyReview.obj.extra_tasks).toContain(27);
            $httpBackend.flush();
            $httpBackend.verifyNoOutstandingExpectation();
        });
        it("add nodes to the processed task lists", function() {
            weeklyReview.query();
            $httpBackend.flush();
            expect(weeklyReview.obj.extra_tasks).not.toContain(27);
            // Primary tasks
            weeklyReview.addTask(27, "primary", false);
            expect(weeklyReview.obj.primary_tasks).toContain(27);
            // Secondary tasks
            weeklyReview.addTask(27, "secondary", false);
            expect(weeklyReview.obj.primary_tasks).toContain(27);
            // Tertiary tasks
            weeklyReview.addTask(27, "tertiary", false);
            expect(weeklyReview.obj.primary_tasks).toContain(27);
            $httpBackend.verifyNoOutstandingRequest();
        });
	it("resets the _nodes list", function() {
	    weeklyReview.query();
            $httpBackend.flush();
	    // Clear out all the task lists and nodes
	    weeklyReview._nodes = [];
	    weeklyReview.obj.primary_tasks = [];
	    weeklyReview.obj.secondary_tasks = [];
	    weeklyReview.obj.tertiary_tasks = [];
	    weeklyReview.obj.extra_tasks = [];
	    // Add a new task
	    weeklyReview.addTask(13, "extra", false);
	    // Check that the review updates the nodes list from the backend
	    expect(weeklyReview._nodes).toBe(null);
	    $httpBackend.expectGET("/gtd/weeklyreviews/2/nodes")
		.respond([]);
	    weeklyReview.nodes;
	    $httpBackend.flush();
	    $httpBackend.verifyNoOutstandingExpectation();
	    $httpBackend.verifyNoOutstandingRequest();
	});
	it("returns a dirty flag", function() {
	    let dirty: boolean = undefined;
	    weeklyReview.query();
            $httpBackend.flush();
            // Check adding a task that doesn't exist
	    expect(weeklyReview.obj.extra_tasks).not.toContain(27);
            dirty = weeklyReview.addTask(27, "primary", false);
	    expect(dirty).toEqual(true);
	    // Check adding a duplicate task
	    dirty = weeklyReview.addTask(27, "primary", false);
	    expect(dirty).toEqual(false);
	});
    });
    describe("the *removeTask()* method", function() {
        it("doesn't hit the backend if the *update* argument is false", function() {
            weeklyReview.query();
            $httpBackend.flush();
            // Extra task
            expect(weeklyReview.obj.extra_tasks).toContain(13);
            weeklyReview.removeTask(13, false);
            $httpBackend.verifyNoOutstandingRequest();
        });
	it("returns a dirty flag", function() {
	    let dirty = undefined;
	    weeklyReview.query();
            $httpBackend.flush();
            // Check something that should be dirty
            expect(weeklyReview.obj.extra_tasks).toContain(13);
            dirty = weeklyReview.removeTask(13, false);
	    expect(dirty).toEqual(true);
	    // Check something that shouldn't be dirty
	    dirty = undefined;
	    dirty = weeklyReview.removeTask(999, false);
	    expect(dirty).toEqual(false);
	})
        it("removes nodes to the lists of tasks", function() {
            weeklyReview.query();
            $httpBackend.flush();
            // Extra task
            expect(weeklyReview.obj.extra_tasks).toContain(13);
            $httpBackend.expectPUT("/gtd/weeklyreviews/2").respond(weeklyReview.obj);
            weeklyReview.removeTask(13);
            expect(weeklyReview.obj.extra_tasks).not.toContain(13);
            // Primary task
            expect(weeklyReview.obj.primary_tasks).toContain(14);
            $httpBackend.expectPUT("/gtd/weeklyreviews/2").respond(weeklyReview.obj);
            weeklyReview.removeTask(14);
            expect(weeklyReview.obj.primary_tasks).not.toContain(14);
            $httpBackend.flush();
            $httpBackend.verifyNoOutstandingExpectation();
        });
	it("ignores some lists if given via the *skipPriorities* argument", function() {
	    weeklyReview.query();
            $httpBackend.flush();
            // Don't actually remove a task from the extra tasks list
            expect(weeklyReview.obj.extra_tasks).toContain(13);
	    weeklyReview.removeTask(13, false, ['extra']);
	    expect(weeklyReview.obj.extra_tasks).toContain(13);
	});
    });
    describe("the *hasTask* method", function() {
	beforeEach(function() {
	    weeklyReview.query();
            $httpBackend.flush();
	});
	it("identifies if it has a node present", function() {
            expect(weeklyReview.obj.extra_tasks).toContain(13);
            expect(weeklyReview.obj.primary_tasks).toContain(14);
            expect(weeklyReview.obj.secondary_tasks).toContain(15);
            expect(weeklyReview.obj.tertiary_tasks).toContain(16);
            expect(weeklyReview.obj.extra_tasks).not.toContain(27);
            expect(weeklyReview.hasTask(13)).toBeTruthy();
            expect(weeklyReview.hasTask(14)).toBeTruthy();
            expect(weeklyReview.hasTask(15)).toBeTruthy();
            expect(weeklyReview.hasTask(16)).toBeTruthy();
            expect(weeklyReview.hasTask(27)).toBeFalsy();
	});
	it("returns false if exceptions are thrown", function() {
	    weeklyReview.obj.extra_tasks = undefined;
	    expect(weeklyReview.hasTask(13)).toBeFalsy();
	});
    });
    it("gets all GTD nodes from the backend", function() {
        weeklyReview.query();
        $httpBackend.flush();
        // Before hitting the database, nodes is an empty list
        $httpBackend.expectGET("/gtd/weeklyreviews/2/nodes")
            .respond([{
                id: 5,
                title: "Hello, world",
            }]);
        let nodes = weeklyReview.nodes;
        expect(nodes.length).toEqual(0);
        // Now let the HTTP backend return some results
        $httpBackend.flush();
        expect(nodes.length).not.toEqual(0);
        // Trying again shouldn't hit the database
        weeklyReview.nodes;
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });
    it("sorts nodes into 1°, 2°, 3° tasks, etc", function() {
        weeklyReview.query();
        $httpBackend.flush();
        weeklyReview.obj.primary_tasks = [5];
        weeklyReview.obj.secondary_tasks = [5];
        // Retrieve the nodes from disk
        $httpBackend.expectGET("/gtd/weeklyreviews/2/nodes")
            .respond([{
                id: 5,
                title: "Hello, world",
            }]);
        weeklyReview.nodes;
        $httpBackend.flush();
        expect(weeklyReview.primary_tasks.length).toEqual(1);
        expect(weeklyReview.secondary_tasks.length).toEqual(1);
    });
    describe("the *move_task()* method", function() {
        it("moves a task to the right list", function() {
            weeklyReview.query();
            $httpBackend.flush();
            // Move a task to primary list
            weeklyReview.moveTask(13, "primary");
            expect(weeklyReview.obj.extra_tasks).not.toContain(13);
            expect(weeklyReview.obj.primary_tasks).toContain(13);
            $httpBackend.expectPUT("/gtd/weeklyreviews/2").respond(weeklyReview.obj);
            $httpBackend.flush();
            $httpBackend.verifyNoOutstandingExpectation();
        });
	it("doesn't hit the backend if the task doesn't actually move", function() {
	    weeklyReview.query();
            $httpBackend.flush();
            // "move" a task from primary list to primary list
	    let taskId: number = weeklyReview.obj.primary_tasks[0];
	    weeklyReview.moveTask(taskId, "primary");
            expect(weeklyReview.obj.primary_tasks).toContain(taskId);
	    $httpBackend.verifyNoOutstandingRequest();
            $httpBackend.verifyNoOutstandingExpectation();
	});
    });
    describe("the *finalize()* method", function() {
        beforeEach(function() {
            jasmine.clock().mockDate(new Date("2021-10-11"))
        });
        it("Sets the appropriate fields in the obj.", function() {
            weeklyReview.query();
            $httpBackend.flush();
            // Check the before state
            expect(weeklyReview.obj.finalized).toBeFalsy();
            expect(weeklyReview.obj.expires).toEqual(undefined);
            expect(weeklyReview.obj.is_active).toBeTruthy();
            // Call the function under test
            weeklyReview.finalize();
            // Check the after state
            let nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            expect(weeklyReview.obj.finalized).toBeTruthy();
            expect(weeklyReview.obj.expires).toEqual(nextWeek);
            expect(weeklyReview.obj.is_active).toBeTruthy();
        });
        it("Sends the update object to the API endpoint", function() {
            let expectedPayload = {
                "id": 2,
                "finalized": "2021-10-11T00:00:00.000Z",
                "is_active": true,
                "extra_tasks": [13],
                "primary_tasks": [14],
                "secondary_tasks": [15],
                "tertiary_tasks": [16],
                "expires": "2021-10-18T00:00:00.000Z",
            };
            weeklyReview.query();
            $httpBackend.flush();
            // Setup the HTTP expectation
            $httpBackend.expectPUT('/gtd/weeklyreviews/' + weeklyReview.obj.id,
                expectedPayload)
                .respond(weeklyReview.obj);
            // Call the code to trigger the PUT request
            weeklyReview.finalize();
            $httpBackend.flush();
            // Verify the PUT request was sent
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
            expect().nothing();
        });
    });
    describe("the *isExpired* getter", function() {
        beforeEach(function() {
            jasmine.clock().mockDate(new Date("2021-10-18T16:35:12Z"));
            weeklyReview.query();
            $httpBackend.flush();
        });
        it("identifies an expired review", function() {
            weeklyReview.obj.expires = "2021-10-17";
            expect(weeklyReview.isExpired).toBeTruthy();
        });
        it("identifies a non-expired review", function() {
            weeklyReview.obj.expires = "2021-10-19";
            expect(weeklyReview.isExpired).toBeFalsy();
        });
        it("returns undefined if no object is present", function() {
            weeklyReview.obj = null;
            expect(weeklyReview.isExpired).toBe(undefined);
        });
    })
})
    ;
