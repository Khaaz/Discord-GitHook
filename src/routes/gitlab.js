'use strict';

// Others
const config = require('../../configs/config.json');

const { Logger } = require('../utils/Logger');

const { IPBanHandler } = require('../services/IPBanHandler');
const { WHRequestHandler } = require('../services/WHRequestHandler');

const { Parser } = require('../services/Parser');

const gitlab = async(req, res) => {
    if (!req.headers['x-gitlab-event']
        || (config.auth && !req.headers['x-gitlab-token'])
        || req.headers['x-gitlab-token'] !== config.authorization) {
        Logger.warn('Unauthorized connection: Refused!');
        res.status(403).send('Unauthorized!');

        const ip = (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0])
            || req.ip
            || (req.connection && req.connection.remoteAddress);
        Logger.warn(`IP: ${ip}`);

        IPBanHandler.countBan(ip);
        return;
    }

    Logger.notice(`Gitlab: ${req.body.project.path_with_namespace} - ${req.body.project.http_url}`); // TO CHANGE
    res.send('Success!');
    Logger.info('Forwarding gitlab request');

    // Creating body formatted for discord
    const body = {
        username: 'GitLab',
        avatar_url: `https://gitlab.com/gitlab-com/gitlab-artwork/raw/master/logo/logo.png`,
        embeds: Parser.parse(req.body), // parsing a discord formatted array of embeds with req datas
    };

    const headers = { 'Content-Type': 'application/json' };

    // Sending to all webhooks
    for (const webhook of WHRequestHandler.webhooks) {
        if (webhook.id && webhook.token) {
            try {
                await WHRequestHandler.request(webhook, { headers, body });
                Logger.verbose(`Posted to ${webhook.name}.`);
            } catch (err) {
                Logger.fatal(`Couldn't post to ${webhook.name}.\n${err.stack}`);
            }
        }
    }

    WHRequestHandler.executeWaiting();
};

exports.gitlab = gitlab;
