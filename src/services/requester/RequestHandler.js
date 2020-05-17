'use strict';

const superagent = require('superagent');

class RequestHandler {
    constructor() {
        this._baseURL = 'https://discord.com/api';
        this.defaultHeaders = {
            'X-RateLimit-Precision': 'millisecond',
        };
    }

    /**
     * Post request a endpoint
     *
     * @param {String} endpoint
     * @param {Object} headers
     * @param {object} body
     * @returns {Promise<Object>} - The request response
     * @memberof RequestHandler
     */
    request(endpoint, headers, body) {
        return superagent
            .post(endpoint)
            .set(headers)
            .send(body);
    }

    /**
     * Create a Request function that will be ran later
     *
     * @param {Object} headers
     * @param {Object} body
     * @param {String} webhookID
     * @param {String} webhookToken
     * @param {Boolean} type - Wether the request is from github
     * @returns {Function} - Closure function wrapping a request
     * @memberof RequestHandler
     */
    createRequest(headers, body, webhookID, webhookToken, type = false) {
        const endpoint = `${this._baseURL}/webhooks/${webhookID}/${webhookToken}${type ? '/github' : ''}`;
        Object.assign(headers, this.defaultHeaders);

        return () => this.request(endpoint, headers, body);
    }
}

exports.RequestHandler = RequestHandler;
