'use strict';

const superagent = require('superagent');

const { Logger } = require('./Logger');
const { sleep } = require('./utils');

const webhooks = require('../../configs/webhooks.json');

/**
 * Handle all requests made to discord webhooks
 *
 * @author KhaaZ
 *
 * @class WHRequestHandler
 */
class WHRequestHandler {
    /**
     * webhook =
     *  {
     *      name: 'WH name',
     *      id: 'WH id'
     *      token: 'WH token'
     *  }
     *
     * req =
     *  {
     *      headers: headers (superagent set)
     *      body: body (superagent send)
     *  }
     *
     * rateLimited =
     *  {
     *      webhook.id: delay (ms)
     *  }
     *
     * reqWaiting =
     *  {
     *      webhook.id: [ { webhookObj, reqObj, type } ]
     *  }
     */
    constructor() {
        this._baseURL = 'https://discordapp.com/api';

        /** Cached webhooks */
        this.webhooks = webhooks;

        /** Webhooks Ratr-limit handling */
        this.rateLimited = {};
        this.reqWaiting = {};
    }

    get baseURL() {
        return this._baseURL;
    }
    /**
     * Requester method to post request to a discord webhook
     *
     * The webhook Object contains information about the webhook to request
     * The req Object contains req.headers + req.body.
     *
     * @param {Object} webhook -Object containing the webhook id and token {name: webhook.name, id: webhook.id, webhook.token }
     * @param {Object} req -Object containing req.headers and req.body from root { headers: req.headers, body: req.body }
     * @param {Boolean} type - true: request github endpoint | false: request regular webhook endpoint
     * @returns {Promise}
     * @memberof WHRequestHandler
     */
    request(webhook, req, type = false) {
        if (this.rateLimited[webhook.id] && Date.now() < this.rateLimited[webhook.id]) { // rate limited + ratelimit not over
            Logger.debug(`this.rateLimited: ${webhook.name} => delaying...`);

            if (!this.reqWaiting[webhook.id]) {
                this.reqWaiting[webhook.id] = [];
            }
            this.reqWaiting[webhook.id].push({ webhook, req, type }); // store the request for later

            return Promise.resolve();
        } else if (this.rateLimited[webhook.id] && Date.now() < this.rateLimited[webhook.id]) { // ratelimit over
            delete this.rateLimited[webhook.id]; // delete this.rateLimited cache + keep executing request
        }

        return superagent
            .post(`${this.baseURL}/webhooks/${webhook.id}/${webhook.token}${type ? '/github' : ''}`)
            .set(req.headers)
            .send(req.body)
            .then(value => {
                if (value.headers['x-ratelimit-remaining'] === '0') { // getting ratelmited. Next request won't be executed
                    this.rateLimited[webhook.id] = value.headers['x-ratelimit-reset'] * 1000;
                    Logger.debug(`Hitting Rate-limit for: ${webhook.name}.`);
                }
            })
            .catch(err => {
                /**
                 * Rate-limited Error could occur in an edge case if something else would have triggered the webhook
                 * Rate Limits the webhook and delays the request
                 */
                if (err.status === 429) {
                    Logger.debug(`Already RateLimited: ${webhook.name} => delaying...`);

                    this.rateLimited[webhook.id] = err.response.headers['x-ratelimit-reset'];

                    if (!this.reqWaiting[webhook.id]) {
                        this.reqWaiting[webhook.id] = [];
                    }
                    this.reqWaiting[webhook.id].push({ webhook, req, type });
                } else {
                    throw err;
                }
            });
    }

    /**
     * Executes all pending request in reqWaiting
     *
     * @returns {Promise}
     */
    async executeWaiting() {
    // Is there a pending request?
        if (Object.keys(this.reqWaiting).length === 0) {
            return;
        }
        // Executes pending request
        for (const waiting in this.reqWaiting) {
        // Checks the ratelimit delay value
            const delay = this.rateLimited[waiting] - Date.now();
            if (delay > 0) {
            // Waits the delay left if the ratelimit is not over
                await sleep(delay);
            }

            // Executes all requests
            for (const request of this.reqWaiting[waiting]) {
                await this.request(request.webhook, request.req, request.type)
                    .then(Logger.verbose(`Posted to ${request.webhook.name}.`))
                    .catch(err => {
                        Logger.fatal(`Couldn't post to ${request.webhook.name}.\n${err}`);
                    });
                // Pops from current pending once executed
                this.reqWaiting[waiting].pop();
            }

            // Deletes waiting request for this webhook
            if (this.reqWaiting[waiting].length === 0) {
                delete this.reqWaiting[waiting];
            }
        }
        // Recursive in case there are new pending requests
        this.executeWaiting();
    }
}

exports.WHRequester = new WHRequestHandler();
