import { module as ngModule } from "angular";
import { Notyf } from 'notyf';

ngModule("orgwolf.weeklyReview")
    .factory("WeeklyReview", weeklyReviewFactory);

weeklyReviewFactory.$inject = ["$http", "$resource"];



function weeklyReviewFactory($http, $resource) {
    let Resource, Nodes, dateInterceptor;
    const notyf = new Notyf;
    // Create the actual resource here
    Resource = $resource(
        '/gtd/weeklyreviews/:id/',
        {
            id: '@id',
        },
        {
            'update': {method: 'PUT'},
            'create': {method: 'POST'},
        },
    );
    Nodes = $resource(
        '/gtd/weeklyreviews/:id/nodes/',
        {
            id: '@id',
        },
    );
    // Define a class to do all the things a weekly review does
    class WeeklyReview {
        public obj;
        private finalized: boolean;
        private _nodes = null;
        private ttl_days: number = 7;

        constructor(finalized: boolean) {
            this.finalized = finalized;
            this.obj = null;
        }

        create() {
            Resource.create({ is_active: true }).$promise.then(newObj => {
                // On success
                this.obj = new Resource(newObj);
            });;
        }

        query() {
	    /**
	     * Retrieve the underlying data from the backend
	     */
            // Decide if we're getting an open or finalized weekly review
            let url: String;
            if (this.finalized) {
                url = "/gtd/weeklyreviews/activereview/";
            } else {
                url = "/gtd/weeklyreviews/openreview/";
            }
            // Retrieve the corresponding weeklyReview object
            $http.get(url).then(response => {
                // Success handler
		if (response.status === 200) {
                    this.obj = new Resource(response.data);
		} else if (response.status === 204) {
		    // No content found
		    this.obj = null;
		} else {
		    console.error("Unknown response when retrieving weekly review from " + url);
		    console.error(response);
		    notyf.error("Error");
		}
            }, response => {
                console.error("Failed to retrieve weekly review object from " + url);
		console.error(response);
                notyf.error("Failed");
	    });
        }

        moveTask(nodeId: bigint, priority: String) {
            // Move a task from one priority list to another
            this.removeTask(nodeId, false);
            this.addTask(nodeId, priority, false);
            this.obj.$update();
        }

        removeTask(newNode: bigint, update: boolean = true) {
            // Find the list that the node is on, and remove it
            let nodeIndex: number, taskLists, dirty: boolean;
            taskLists = [this.obj.extra_tasks, this.obj.primary_tasks,
            this.obj.secondary_tasks, this.obj.tertiary_tasks];
            dirty = false;
            for (let taskList of taskLists) {
                if (taskList.includes(newNode)) {
                    nodeIndex = taskList.indexOf(newNode);
                    taskList.splice(nodeIndex, 1);
                    dirty = true;
                }
            }
            if (dirty && update) {
                this.obj.$update();
            }
        }

        hasTask(nodeId: number): boolean {
	    /**
	     * Determine whether a given node is present as a task in
	     * this weekly review. If the object is not loaded or the
	     * task lists are otherwise inaccessible, defaults to
	     * false.
	     * 
	     * @param {number} nodeId The id of the node to look for.
	     */
	    let taskInList: boolean;
	    try {
		taskInList = (
                    this.obj.extra_tasks.includes(nodeId) ||
                    this.obj.primary_tasks.includes(nodeId) ||
                    this.obj.secondary_tasks.includes(nodeId) ||
                    this.obj.tertiary_tasks.includes(nodeId)
                );
	    } catch(err) {
		// If we can't tell whether the task exists, return undefined
		if (err instanceof TypeError) {
		    taskInList = false;
		} else {
		    throw err;
		}
	    }
	    return taskInList
        }

        addTask(newNode: number, priority: String = "extra", update: boolean = true) {
	    /**
	     * Add the node to a task list (defaults to extra_tasks)
	     *
	     * @param {number}  newNode  The ID of the node to add.
	     * @param {String}  priority Which list to add it to:
	     *   primary, secondary, tertiary, extra
	     * @param {boolean} update   Whether to send the change to
	     *   the database.
	     */
            // Determine which task list to use
            let taskList: Array<bigint>;
            switch (priority) {
                case "primary":
                    taskList = this.obj.primary_tasks;
                    break;
                case "secondary":
                    taskList = this.obj.secondary_tasks;
                    break;
                case "tertiary":
                    taskList = this.obj.tertiary_tasks;
                    break;
                case "extra":
                    taskList = this.obj.extra_tasks;
                    break;
            }
            // Add this node to the list if not present
            if (!taskList.includes(newNode)) {
                taskList.push(newNode);
                if (update) {
                    this.obj.$update();
                }
		this._nodes = null;
            }
        }
        get nodes() {
            if (this.obj !== null && this.obj.id !== undefined) {
                // A valid database instance is present, so get the nodes
                if (this._nodes === null) {
                    this._nodes = Nodes.query({ id: this.obj.id });
                }
                return this._nodes;
            } else {
                // No valid database instance yet
                return [];
            }
        }
        private get_nodes_from_tasks(task_ids) {
            var tasks, nodes;
            tasks = [];
            if (this.obj !== null) {
                // Object is retrieved, so parse the nodes
                nodes = this.nodes;
                for (let node of nodes) {
                    // Check if the given node is one of the tasks we want
                    if (task_ids.indexOf(node.id) > -1) {
                        tasks.push(node)
                    }
                }
            }
            return tasks;
        }

        get primary_tasks() {
            return this.get_nodes_from_tasks(this.obj !== null ? this.obj.primary_tasks : []);
        }

        get secondary_tasks() {
            return this.get_nodes_from_tasks(this.obj !== null ? this.obj.secondary_tasks : []);
        }

        get tertiary_tasks() {
            return this.get_nodes_from_tasks(this.obj !== null ? this.obj.tertiary_tasks : []);
        }

        get extra_tasks() {
            return this.get_nodes_from_tasks(this.obj !== null ? this.obj.extra_tasks : []);
        }

        get isActive() {
            return this.obj !== null ? this.obj.is_active : false;
        }

        get isOpen() {
            return this.obj !== null ? this.obj.is_active && !this.obj.finalized : false;
        }

        get isExpired() {
            // Return a boolean describing whether the review has already expired
            //   or undefined if no object is available
            let now, is_expired;
            now = new Date();
            is_expired = undefined
            if (this.obj !== null) {
                is_expired = (new Date(this.obj.expires) < now);
            }
            return is_expired;
        }

        get taskCount() {
            let count = 0;
            if (this.obj !== null) {
                count = this.obj.primary_tasks.length + this.obj.secondary_tasks.length + this.obj.tertiary_tasks.length + this.obj.extra_tasks.length;
            }
            return count;
        }
        finalize() {
            // Set the review to expire in a week
            let now = new Date()
            let expiration = new Date();
            expiration.setDate(expiration.getDate() + this.ttl_days);
            this.obj.finalized = now;
            this.obj.expires = expiration;
            // Update the API endpoint with the new data
            this.obj.$update();
        }
        cancel() {
            let that = this;
            console.log("Closing open review " + this.obj.id);
            this.obj.$delete().then(response => {
                console.log("Delete call successful for review " + this.obj.id, response);
                that.obj = null;
            });
        }
    }
    return WeeklyReview;
}
