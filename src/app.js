'use strict';
// Dependencies
const express = require('express');
const bodyParser = require('body-parser');

// Others
const { Logger } = require('./utils/Logger.js');
const config = require('./configs/config.json');

const routes = require('./routes/index');

// const
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', routes.router);

app.listen(config.port, Logger.notice(`Listening to port ${config.port}`));
