'use strict';
// Dependencies
const express = require('express');
const bodyParser = require('body-parser');

// Others
const { Logger } = require('./utils/Logger.js');
const { IPBanHandler } = require('./services/IPBanHandler');

const config = require('../configs/config.json');

const routes = require('./routes/index');

// const
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res) => {
    // IP should always exist
    const ip = (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0])
        || req.ip
        || (req.connection && req.connection.remoteAddress);

    if (!ip || IPBanHandler.banned.has(ip)) {
        res.status(403).send('Unauthorized');
        Logger.warn(`Blacklisted ip request: ${ip}. Refused connection!`);
        return;
    }

    routes.router(req, res);
});

app.listen(config.port, Logger.notice(`Listening to port ${config.port}`));
