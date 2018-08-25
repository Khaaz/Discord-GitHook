'use strict';

// Dependency
const { createHmac, timingSafeEqual } = require('crypto');

// Others
const config = require('../../configs/config.json');

const verifySignature = function verifySignature(signature, payloadBody) {
    const HMAC = `sha1=${createHmac('sha1', config.authorization)
        .update(JSON.stringify(payloadBody))
        .digest('hex')}`;
    return timingSafeEqual(Buffer.from(signature), Buffer.from(HMAC));
};

/** Wait for a delay in ms*/
const sleep = (ms) => new Promise((res) => setTimeout(() => res(), ms));

module.exports = {
    verifySignature,
    sleep,
};
