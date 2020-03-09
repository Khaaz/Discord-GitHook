'use strict';

const { RequestQueue } = require('./RequestQueue');
const { RequestHandler } = require('./RequestHandler');

const { Logger } = require('../../utils/Logger');

class RequestManager {
    constructor(webhooks, requestHandler) {
        this._webhooks = webhooks;
        this._executors = new Map();

        this.requester = requestHandler || new RequestHandler();
    }

    /**
     * Execute all webhooks request
     *
     * @param {Object} data - {data.headers, data.body} The data to use for the request
     * @param {Boolean} [type=false] - Wether the request is from github
     * @memberof RequestManager
     */
    async request(data, type = false) {
        for (const webhook of this._webhooks) {
            if (webhook.id && webhook.token) {
                const executor = this.getOrCreateExecutor(webhook.id);
                const req = this.createRequest(data.headers, data.body, webhook, type);

                try {
                    await executor.add(req, webhook.name);
                    Logger.verbose(`Posted to ${webhook.name}.`);
                } catch (err) {
                    Logger.fatal(`Couldn't post to ${webhook.name}\n${err.stack}`);
                }
            }
        }
    }

    /**
     * Get or create an executor for this webhook (RequestQueue)
     *
     * @param {String} id - The webhook id
     * @returns {RequestQueue} - The executor for this webhook
     */
    getOrCreateExecutor(id) {
        let executor = this._executors.get(id);
        if (!executor) {
            executor = new RequestQueue();
            this._executors.set(id, executor);
        }
        return executor;
    }

    /**
     * Create a request function closure
     *
     * @param {Object} headers
     * @param {Object} body
     * @param {Object} webhook
     * @param {Boolean} type
     */
    createRequest(headers, body, webhook, type) {
        return this.requester.createRequest(headers, body, webhook.id, webhook.token, type);
    }
}

exports.RequestManager = RequestManager;
