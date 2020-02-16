'use strict';

const { sleep } = require('../../utils/utils');
const { Logger } = require('../../utils/Logger');

/**
 * This data structure is a RequestQueue that will run every function one by one sequentially.
 * It will autoexecute any request added to the queue.
 * It will also retry the request if it fails due to ratelimit
 *
 * @author KhaaZ
 *
 * @class RequestQueue
 */
class RequestQueue {
    /**
    * Creates an instance of RequestQueue.
    *
    * @memberof RequestQueue
    */
    constructor() {
        this._functions = [];
        this._running = false;
    }
    /**
     * Execute the RequestQueue.
     * Handles ratelimits
     *
     * @memberof AsyncRequestQueue
     */
    async exec() {
        if (this._functions.length > 0) {
            this._running = true;

            const func = this._functions.shift();
            let delay = 0;
            try {
                const res = await func.run();
                // Request was correctly done, resolve the promise.
                func.resolve(res);

                // Next request will be ratelimited: delaying
                if (res.headers['x-ratelimit-remaining'] === '0') {
                    delay = res.headers['x-ratelimit-reset-after'];
                    Logger.debug(`Hitting Rate-limit for ${func.name}: delaying next request...`);
                }
            } catch (err) {
                // Error due to ratelimit, retrying the request and delaying
                if (err.status === 429) {
                    Logger.debug(`Already RateLimited for ${func.name}: delaying and retrying...`);
                    this._functions.unshift(func);
                    delay = err.response.headers['x-ratelimit-reset-after'];

                // Not a ratelimit error
                } else {
                    // Request errored: reject the promise
                    func.reject(err);
                }
            }
            if (delay !== 0) {
                // delay is in seconds: converting to ms
                sleep(delay * 1000);
            }

            this.exec();
        } else {
            this._running = false;
        }
    }

    /**
     * Adds a function to the RequestQueue.
     * The function is already wrapped in a closure so it can be added directly in the queue.
     * Wraps the function in an object to get more contextual information and be able to resolve and reject the promise at the correct time.
     * Returns the promise, so the caller can know when the request was done.
     *
     * @param {Function} func - The function to run
     * @returns {Promise}
     * @memberof AsyncRequestQueue
     */
    add(func, whName) {
        const promise = new Promise((resolve, reject) => {
            const fn = { name: whName, run: func, resolve, reject };
            this._functions.push(fn);
        });

        if (!this._running) {
            this.exec();
        }

        return promise;
    }
}

exports.RequestQueue = RequestQueue;
