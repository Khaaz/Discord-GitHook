'use strict';

// Others
const config = require('../../configs/config.json');

const { Logger }  = require('../utils/Logger');

const { WHRequester } = require('../utils/WHRequestHandler');

const { verifySignature } = require('../utils/utils');

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

const github = async(req, res) => {
    // Checking whether the authenticity of the connection is valid
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

    // Creating new headers
    const headers = constructHeaders(req.headers);

    // Sending to all webhooks
    for (const webhook of WHRequester.webhooks) {
        if (webhook.id && webhook.token) {
            try {
                await WHRequester.request(webhook, { headers, body: req.body }, true);
                Logger.verbose(`Posted to ${webhook.name}.`);
            } catch (err) {
                Logger.fatal(`Couldn't post to ${webhook.name}.\n${err.stack}`);
            }
        }
    }

    WHRequester.executeWaiting();
};

exports.github = github;
