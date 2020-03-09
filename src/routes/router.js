'use strict';

// Dependency
const express = require('express');

const config = require('../../configs/config.json');
const webhooks = require('../../configs/webhooks.json');

// Other
const { NetworkManager } = require('../services/NetworkManager');

const { Logger } = require('../utils/Logger');
const { github, gitlab } = require('./index');
// const
const router = express.Router(); // eslint-disable-line

const DEFAULT = 'default';

if (!config.networks || config.networks.length === 0) {
    config.networks = [DEFAULT];
}

for (const webhook of webhooks) {
    if (!webhook.networks || webhook.networks.length === 0) {
        webhook.networks = [DEFAULT];
    }
}

const networkManager = new NetworkManager(config.networks, webhooks);

router.post('/', (req, res) => {
    try {
        if (req.headers['x-github-delivery'] ) {
            github(networkManager, DEFAULT, req, res);
        } else if (req.headers['x-gitlab-event'] ) {
            gitlab(networkManager, DEFAULT, req, res);
        }
    } catch (err) {
        Logger.error(err.stack);
    }
} );

router.post('/github', (req, res) => {
    github(networkManager, DEFAULT, req, res);
} );

router.post('/gitlab', (req, res) => {
    gitlab(networkManager, DEFAULT, req, res);
} );

router.post('/:network/github', (req, res) => {
    github(networkManager, req.params.network, req, res);
} );

router.post('/:network/gitlab', (req, res) => {
    gitlab(networkManager, req.params.network, req, res);
} );

exports.router = router;
