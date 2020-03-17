'use strict';

class Webhook {
    constructor(name, id, token) {
        this.name = name;
        this._id = id;
        this._token = token;
    }

    get id() {
        return this._id;
    }

    get token() {
        return this._token;
    }
}

exports.Webhook = Webhook;
