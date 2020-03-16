'use strict';

const express = require('express');

const config = require('../../configs/config.json');
const webhooks = require('../../configs/webhooks.json');

const { NetworkManager } = require('../services/NetworkManager');

const { Logger } = require('../utils/Logger');
const { github, gitlab } = require('./index');

const router = express.Router(); // eslint-disable-line new-cap
const DEFAULT = 'default';

function validateConfig(_config, _webhooks) {
    if (!_config.networks || _config.networks.length === 0) {
        _config.networks = [{ name: DEFAULT }];
    }
    
    for (const webhook of _webhooks) {
        if (!webhook.networks || webhook.networks.length === 0) {
            webhook.networks = [DEFAULT];
        } else if (!_config.networks.some(n => webhook.networks.includes(n.name) ) ) {
            webhook.networks.push(DEFAULT);
        }
    }
    
    if (_webhooks.find(w => w.networks.includes(DEFAULT) ) && !_config.networks.find(n => n.name === DEFAULT) ) {
        _config.networks.push( { name: DEFAULT } );
    }
}

validateConfig(config, webhooks);

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
