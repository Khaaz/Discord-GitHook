'use strict';

const { RequestManager } = require('./requester/RequestManager');
const { RequestHandler } = require('./requester/RequestHandler');
const { Webhook } = require('./Webhook');

class NetworkManager {
    constructor(networks, webhooks) {
        this.requester = new RequestHandler();

        this.networks = new Map();

        const _network = {};
        for (const network of networks) {
            _network[network] = [];
        }

        for (const webhook of webhooks) {
            for (const network of webhook.networks) {
                if (_network[network] ) {
                    _network[network] = new Webhook(webhook.name, webhook.id, webhook.token);
                }
            }
        }

        for (const network of networks) {
            this.networks.set(network, new RequestManager(_network[network], this.requester) );
        }
    }

    execute(network, data, type) {
        this.networks.get(network).request(data, type);
    }
}

exports.NetworkManager = NetworkManager;
