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

        moveTask(nodeId: number, priority: string) {
	    let dirty: boolean = false;
            // Move a task from one priority list to another
            dirty = this.removeTask(nodeId, false, [priority]) || dirty;
            dirty = this.addTask(nodeId, priority, false) || dirty;
	    // Update the database if needed
	    if (dirty) {
		this.obj.$update();
	    }
        }

        removeTask(nodeId: number, update: boolean = true, skipPriorities: Array<string> = []) {
	    /**
	     * Remove a task from task lists.
	     * 
	     * @param   {number}        nodeId         ID of the node to remove from lists.
	     * @param   {boolean}       update         If true, update the node on the backend if the object was changed.
	     * @param   {Array[string]} skipPriorities Which lists to ignore. Useful if you plan to re-add later. Valid choices: are "primary", "secondary", "tertiary", "extra.
	     * @returns {boolean}       dirty          True if the object was changed, false otherwise.
	     */
            let nodeIndex: number, taskLists, dirty: boolean;
	    // Determine which lists to check
            taskLists = {
		'primary': this.obj.primary_tasks,
		'secondary': this.obj.secondary_tasks,
		'tertiary': this.obj.tertiary_tasks,
		'extra': this.obj.extra_tasks
	    };
	    for (let priority of skipPriorities) {
		delete taskLists[priority];
	    }
	    // Find the list that the node is on, and remove it
            dirty = false;
	    let taskList;
            for (let listName in taskLists) {
		taskList = taskLists[listName];
                if (taskList.includes(nodeId)) {
                    nodeIndex = taskList.indexOf(nodeId);
                    taskList.splice(nodeIndex, 1);
                    dirty = true;
                }
            }
            if (dirty && update) {
                this.obj.$update();
            }
	    return dirty;
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

        addTask(newNode: number, priority: String = "extra", update: boolean = true): boolean {
	    /**
	     * Add the node to a task list (defaults to extra_tasks)
	     *
	     * @param {number}   newNode  The ID of the node to add.
	     * @param {String}   priority Which list to add it to:
	     *   primary, secondary, tertiary, extra
	     * @param {boolean}  update   Whether to send the change to
	     *   the database.
	     * @return {boolean} dirty   Whether the underlying object was modified.
	     */
            // Determine which task list to use
            let taskList: Array<number>;
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
	    let dirty: boolean = false;
            if (!taskList.includes(newNode)) {
                taskList.push(newNode);
		dirty = true;
                if (update) {
                    this.obj.$update();
                }
		this._nodes = null;
            }
	    return dirty;
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
