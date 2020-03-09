'use strict';

// Others
const config = require('../../configs/config.json');

const { Logger }  = require('../utils/Logger');

const { IPBanHandler } = require('../services/IPBanHandler');

const { verifyGithubSignature, UNAUTHORIZED_CODE } = require('../utils/utils');

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
    if (reqHeaders['x-forwarded-proto'] ) {
        headers['x-forwarded-proto'] = reqHeaders['x-forwarded-proto'];
    }

    // Optional Github signature
    if (reqHeaders['x-hub-signature'] ) {
        headers['x-hub-signature'] = reqHeaders['x-hub-signature'];
    }
     

    return headers;
}

const github = async(manager, network, req, res) => {
    // Checking whether the authenticity of the connection is valid
    if (!req.headers['x-github-delivery']
        || (config.auth && !req.headers['x-hub-signature'] )
        || !verifyGithubSignature(req.headers['x-hub-signature'], req.body) ) {
        Logger.warn('Unauthorized connection: Refused!');
        res.status(UNAUTHORIZED_CODE).send('Unauthorized!');

        const ip = (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0] )
            || req.ip
            || (req.connection && req.connection.remoteAddress);
        Logger.warn(`IP: ${ip}`);

        IPBanHandler.countBan(ip);
        return;
    }

    if (req.body.organization) {
        Logger.notice(`Github: ${req.body.organization.login} - ${req.body.organization.url}`);
    }
    if (req.body.repository) {
        Logger.notice(`Github: ${req.body.repository.full_name} - ${req.body.repository.url}`);
    }

    res.send('Success!');
    Logger.info('Forwarding github request');

    // Creating new headers
    const headers = constructHeaders(req.headers);

    manager.execute(network, { headers, body: req.body }, true);
};

module.exports = github;
