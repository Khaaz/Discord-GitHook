'use strict';

const { RequestManager } = require('./requester/RequestManager');
const { RequestHandler } = require('./requester/RequestHandler');
const { Webhook } = require('./Webhook');

class NetworkManager {
    constructor(networks, webhooks) {
        this.requester = new RequestHandler();

        this.networks = new Map();

        const _networks = {};
        for (const network of networks) {
            _networks[network.name] = [];
        }

        for (const webhook of webhooks) {
            for (const network of webhook.networks) {
                if (_networks[network] ) {
                    _networks[network].push(new Webhook(webhook.name, webhook.id, webhook.token) );
                }
            }
        }

        for (const network of networks) {
            this.networks.set(network.name, new RequestManager(_networks[network.name], this.requester) );
        }
    }

    execute(network, data, type) {
        const requester = this.networks.get(network);
        if (!requester) {
            console.log(`Invalid network ${network}`);
            return;
        }
        requester.request(data, type);
    }
}

exports.NetworkManager = NetworkManager;
