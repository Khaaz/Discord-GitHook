'use strict';
const express = require('express');
const bodyParser = require('body-parser');

const { Logger } = require('./utils/Logger.js');
const { getIP, UNAUTHORIZED_CODE } = require('./utils/utils');
const { IPBanHandler } = require('./services/IPBanHandler');

const config = require('../configs/config.json');
const { router } = require('./routes/router');

const app = express();

app.use(bodyParser.json() );
app.use(bodyParser.urlencoded( { extended: true } ) );

// Handle banned ips - then reroute to the correct endpoint
app.use( (req, res) => {
    // IP should always exist
    const ip = getIP(req);

    if (!ip || IPBanHandler.banned.has(ip) ) {
        res.status(UNAUTHORIZED_CODE).send('Unauthorized');
        Logger.warn(`Blacklisted ip request: ${ip}. Refused connection!`);
        return;
    }

    router(req, res);
} );

app.listen(config.port, Logger.notice(`Listening on port ${config.port}`) );
