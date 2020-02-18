'use strict';

// Others
const config = require('../../configs/config.json');

const { Logger } = require('../utils/Logger');
const { UNAUTHORIZED_CODE } = require('../utils/utils');

const { IPBanHandler } = require('../services/IPBanHandler');
const { RequestManager } = require('../services/requester/RequestManager');

const { GitlabParser } = require('../services/parsers/GitlabParser');
const parser = new GitlabParser();

const gitlab = async(req, res) => {
    if (!req.headers['x-gitlab-event']
        || (config.auth && !req.headers['x-gitlab-token'] )
        || (config.auth && req.headers['x-gitlab-token'] !== config.authorizationGitlab) ) {
        Logger.warn('Unauthorized connection: Refused!');
        res.status(UNAUTHORIZED_CODE).send('Unauthorized!');

        const ip = (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0] )
            || req.ip
            || (req.connection && req.connection.remoteAddress);
        Logger.warn(`IP: ${ip}`);

        IPBanHandler.countBan(ip);
        return;
    }

    Logger.notice(`Gitlab: ${req.body.project ? `${req.body.project.path_with_namespace} - ${req.body.project.http_url}` : ''} `); // TO CHANGE
    res.send('Success!');
    Logger.info('Forwarding gitlab request');

    const discordRequest = parser.parse(req.body);
    // Close guard: doesn't send webhook if discordRequest is null
    if (!discordRequest) {
        return;
    }

    const headers = { 'Content-Type': 'application/json' };

    RequestManager.request( { headers, body: discordRequest } );
};

exports.gitlab = gitlab;
