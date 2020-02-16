'use strict';

// Dependency
const { createHmac, timingSafeEqual } = require('crypto');

// Others
const config = require('../../configs/config.json');

const verifyGithubSignature = function verifyGithubSignature(signature, payloadBody) {
    const HMAC = `sha1=${createHmac('sha1', config.authorizationGithub)
        .update(JSON.stringify(payloadBody) )
        .digest('hex')}`;
    return timingSafeEqual(Buffer.from(signature), Buffer.from(HMAC) );
};

/** Wait for a delay in ms*/
const sleep = (ms) => new Promise( (res) => setTimeout( () => res(), ms) );

const RATELIMIT_CODE = 423;
const UNAUTHORIZED_CODE = 403;

module.exports = {
    verifyGithubSignature,
    sleep,
    RATELIMIT_CODE,
    UNAUTHORIZED_CODE,
};
