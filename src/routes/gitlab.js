'use strict';

// Others
const config = require('../../configs/config.json');

const { Logger } = require('../utils/Logger');
const { UNAUTHORIZED_CODE } = require('../utils/utils');

const { IPBanHandler } = require('../services/IPBanHandler');
const { RequestManager } = require('../services/requester/RequestManager');

const { Parser } = require('../services/Parser');

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

    const embeds = Parser.parse(req.body);
    // Close guard: doesn't send webhook if no embeds have been constructed
    if (embeds.length === 0) {
        return;
    }
    // Creating body formatted for discord
    const body = {
        username: 'GitLab',
        avatar_url: `https://gitlab.com/gitlab-com/gitlab-artwork/raw/master/logo/logo.png`,
        embeds, // parsing a discord formatted array of embeds with req datas
    };

    const headers = { 'Content-Type': 'application/json' };

    RequestManager.request( { headers, body } );
};

exports.gitlab = gitlab;
