'use strict';

// Dependency
const crypto = require('crypto');

// Others
const config = require('../configs/config.json');

const verifySignature = function verifySignature(signature, payloadBody) {
    const HMAC = `sha1=${crypto.createHmac('sha1', config.authorization)
        .update(JSON.stringify(payloadBody))
        .digest('hex')}`;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(HMAC));
};

module.exports = {
    verifySignature,
};
