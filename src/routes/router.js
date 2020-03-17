'use strict';

const express = require('express');

const config = require('../../configs/config.json');
const webhooks = require('../../configs/webhooks.json');

const { NetworkManager } = require('../services/NetworkManager');

const { Logger } = require('../utils/Logger');
const { github, gitlab } = require('./index');

const router = express.Router(); // eslint-disable-line new-cap
const DEFAULT = 'default';
const GITHUB_TYPE = 0;
const GITLAB_TYPE = 1;

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

function getNetworkAndAuth(curNetwork, _config, type) {
    let auth = (type === GITHUB_TYPE)
        ? _config.authorizationGithub
        : _config.authorizationGitlab;

    const networkObj = _config.networks.find(e => e.name === curNetwork);
    if (networkObj) {
        // If the auth property exist, we will use it. If you want to use the global auth for this network, don't setup the auth property at all
        // If the auth property is empty, it will consider the network doesn't have any auth
        if (type === GITHUB_TYPE && (networkObj.authorizationGithub !== undefined) ) {
            auth = networkObj.authorizationGithub;
        } else if (type === GITLAB_TYPE && (networkObj.authorizationGitlab !== undefined) ) {
            auth = networkObj.authorizationGitlab;
        }
    }

    return {
        network: curNetwork,
        auth,
    };
}

validateConfig(config, webhooks);

const networkManager = new NetworkManager(config.networks, webhooks);

router.post('/', (req, res) => {
    try {
        if (req.headers['x-github-delivery'] ) {
            github(networkManager, getNetworkAndAuth(DEFAULT, config, GITHUB_TYPE), req, res);
        } else if (req.headers['x-gitlab-event'] ) {
            gitlab(networkManager, getNetworkAndAuth(DEFAULT, config, GITLAB_TYPE), req, res);
        } else {
            Logger.error('Invalid source.');
        }
    } catch (err) {
        Logger.error(err.stack);
    }
} );

router.post('/github', (req, res) => {
    github(networkManager, getNetworkAndAuth(DEFAULT, config, GITHUB_TYPE), req, res);
} );

router.post('/gitlab', (req, res) => {
    gitlab(networkManager, getNetworkAndAuth(DEFAULT, config, GITLAB_TYPE), req, res);
} );

router.post('/:network/github', (req, res) => {
    const { network } = req.params;
    github(networkManager, getNetworkAndAuth(network, config, GITHUB_TYPE), req, res);
} );

router.post('/:network/gitlab', (req, res) => {
    const { network } = req.params;
    gitlab(networkManager, getNetworkAndAuth(network, config, GITLAB_TYPE), req, res);
} );

exports.router = router;
