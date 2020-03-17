'use strict';

const { Logger }  = require('../utils/Logger');
const { verifyGithubSignature, getIP, UNAUTHORIZED_CODE } = require('../utils/utils');

const { IPBanHandler } = require('../services/IPBanHandler');

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

const github = async(manager, { network, auth }, req, res) => {
    // AUTH check
    if (!req.headers['x-github-delivery']
        || (auth && auth.length > 0 && !req.headers['x-hub-signature'] )
        || (auth && auth.length > 0 && !verifyGithubSignature(req.headers['x-hub-signature'], req.body, auth) ) ) {
        Logger.warn('Unauthorized connection: Refused!');
        res.status(UNAUTHORIZED_CODE).send('Unauthorized!');

        const ip = getIP(req);
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
