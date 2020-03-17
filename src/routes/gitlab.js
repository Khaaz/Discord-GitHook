'use strict';

const { Logger } = require('../utils/Logger');
const { getIP, UNAUTHORIZED_CODE } = require('../utils/utils');

const { IPBanHandler } = require('../services/IPBanHandler');
const { GitlabParser } = require('../services/parsers/GitlabParser');

const parser = new GitlabParser();

const gitlab = async(manager, { network, auth }, req, res) => {
    // AUTH check
    if (!req.headers['x-gitlab-event']
        || (auth && auth.length > 0 && !req.headers['x-gitlab-token'] )
        || (auth && auth.length > 0 && req.headers['x-gitlab-token'] !== auth) ) {
        Logger.warn('Unauthorized connection: Refused!');
        res.status(UNAUTHORIZED_CODE).send('Unauthorized!');

        const ip = getIP(req);
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

    manager.execute(network, { headers, body: discordRequest } );
};

module.exports = gitlab;
