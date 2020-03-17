'use strict';

const { createHmac, timingSafeEqual } = require('crypto');

function verifyGithubSignature(signature, payloadBody, auth) {
    const HMAC = `sha1=${createHmac('sha1', auth)
        .update(JSON.stringify(payloadBody) )
        .digest('hex')}`;
    return timingSafeEqual(Buffer.from(signature), Buffer.from(HMAC) );
}

function getIP(req) {
    return (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0] )
        || req.ip
        || (req.connection && req.connection.remoteAddress);
}

/** Wait for a delay in ms*/
const sleep = (ms) => new Promise( (res) => setTimeout( () => res(), ms) );

const RATELIMIT_CODE = 423;
const UNAUTHORIZED_CODE = 403;

module.exports = {
    verifyGithubSignature,
    getIP,
    sleep,
    RATELIMIT_CODE,
    UNAUTHORIZED_CODE,
};
