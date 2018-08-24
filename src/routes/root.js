'use strict';

// Dependency
const superagent = require('superagent');

// Others
const webhooks = require('../../configs/webhooks.json');
const config = require('../../configs/config.json');
const { Logger }  = require('../utils/Logger');
const verifySignature = require('../utils/utils').verifySignature;

// CONST
const discord = 'https://discordapp.com/api';

const rateLimited = {};
const reqWaiting = {};
/**
 * webhook =
 *  {
 *      name: 'smthing',
 *      id: 'smthing'
 *      token: 'smthing
 *  }
 *
 * rateLimited =
 *  {
 *      webhook.id: delay
 *  }
 *
 * reqWaiting =
 *  {
 *      webhook.id: [ { webhookObj, reqObj } ]
 *  }
 */

/** Wait for a delay in ms*/
const sleep = (ms) => new Promise((res) => setTimeout(() => res(), ms));

/**
 * Build an Headers Object from req headers object
 * Follow exact github headers object in purpose to forward to discord
 *
 * @param {Object} reqHeaders
 * @returns {Object} headers - the new headers object in the correct format
 */
function constructHeaders(reqHeaders) {
    const headers = {};
    headers.accept = reqHeaders.accept;
    headers['content-length'] = reqHeaders['content-length'];
    headers['content-type'] = reqHeaders['content-type'];
    headers['user-agent'] = reqHeaders['user-agent'];
    headers['x-forwarded-for'] = reqHeaders['x-forwarded-for'];
    headers['x-github-delivery'] = reqHeaders['x-github-delivery'];
    headers['x-github-event'] = reqHeaders['x-github-event'];

    // Optional (SSL certificate)
    reqHeaders['x-forwarded-proto'] ? (headers['x-forwarded-proto'] = reqHeaders['x-forwarded-proto']) : null;

    // Optional Github signature
    reqHeaders['x-hub-signature'] ? (headers['x-hub-signature'] = reqHeaders['x-hub-signature']) : null;

    return headers;
}

/**
 * Request to discord And handle rate limit
 *
 * @param {Object} webhook - Object containing the webhook id and token {name: webhook.name, id: webhook.id, webhook.token }
 * @param {Object} req - Object containing req.headers and req.body from root { headers: req.headers, body: req.body }
 * @returns {Promise}
 */
function requester(webhook, req) {
    if (rateLimited[webhook.id] && Date.now() < rateLimited[webhook.id]) { // rate limited + ratelimit not over
        Logger.debug(`Ratelimited: ${webhook.name} => delaying...`);
        if (!reqWaiting[webhook.id]) {
            reqWaiting[webhook.id] = [];
        }
        reqWaiting[webhook.id].push({ webhook, req }); // store the request for later
        return Promise.resolve();
    } else if (rateLimited[webhook.id] && Date.now() < rateLimited[webhook.id]) { // ratelimit over
        delete rateLimited[webhook.id]; // delete rateLimited cache + keep executing request
    }

    return superagent
        .post(`${discord}/webhooks/${webhook.id}/${webhook.token}/github`)
        .set(req.headers)
        .send(req.body)
        .then(value => {
            if (value.headers['x-ratelimit-remaining'] === '0') { // getting ratelmited. Next request won't be executed
                rateLimited[webhook.id] = value.headers['x-ratelimit-reset'] * 1000;
                Logger.debug(`Hitting Rate-limit for: ${webhook.name}.`);
            }
        })
        .catch(err => {
            // Rate-limited Error could occur in an edge case if something else would have triggered the webhook other than us
            if (err.status === 429) {
                Logger.debug(`Already ratelimited: ${webhook.name} => delaying...`);

                rateLimited[webhook.id] = err.response.headers['x-ratelimit-reset'];

                if (!reqWaiting[webhook.id]) {
                    reqWaiting[webhook.id] = [];
                }
                reqWaiting[webhook.id].push({ webhook, req });
            } else {
                throw err;
            }
        });
}

/**
 * Execute all pending request in reqWaiting
 *
 * @returns {Promise}
 */
async function executeWaiting() {
    // Is there pending request?
    if (Object.keys(reqWaiting).length === 0) {
        return;
    }
    // execute pending request
    for (const waiting in reqWaiting) {
        // check the ratelimit delay value
        const delay = rateLimited[waiting] - Date.now();
        if (delay > 0) {
            // wait the delay left if the ratelimit is not over
            await sleep(delay);
        }

        // execute all request
        for (const request of reqWaiting[waiting]) {
            requester(request.webhook, request.req)
                .then(Logger.verbose(`Posted to ${request.webhook.name}.`))
                .catch(err => {
                    Logger.fatal(`Couldn't post to ${request.webhook.name}.\n${err}`);
                });
            // pop from current pending once executed
            reqWaiting[waiting].pop();
        }

        // delete waiting request for this webhook
        if (reqWaiting[waiting].length === 0) {
            delete reqWaiting[waiting];
        }
    }
    // recursive in case there are new request waiting
    executeWaiting();
}

const root = async(req, res) => {
    // Checking whereas the connection is valid
    if ((config.auth && !req.headers['x-hub-signature']) || !verifySignature(req.headers['x-hub-signature'], req.body)) {
        Logger.warn('Unauthorized connection: Refused!');
        res.send('Unauthorized!');

        const ip = (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0])
            || req.ip
            || (req.connection && req.connection.remoteAddress);
        Logger.verbose(`IP: ${ip ? ip : 'not-found'}`);
        return;
    }

    Logger.notice(`Github: ${req.body.repository.full_name} - ${req.body.repository.url}`);
    res.send('Success!');
    Logger.info('Forwarding github request');

    // Creating a new headers
    const headers = constructHeaders(req.headers);

    // Sending to all webhooks
    for (const webhook of webhooks) {
        if (webhook.id && webhook.token) {
            try {
                await requester(webhook, { headers, body: req.body });
                Logger.verbose(`Posted to ${webhook.name}.`);
            } catch (err) {
                Logger.fatal(`Couldn't post to ${webhook.name}.\n${err.stack}`);
            }
        }
    }

    executeWaiting();
};

exports.root = root;
