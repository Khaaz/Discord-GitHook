'use strict';

// Dependency
const superagent = require('superagent');

// Others
const webhooks = require('../../configs/webhooks.json');
const config = require('../../configs/config.json');

// Const
const discord = 'https://discordapp.com/api';

const gitlab = (req, res) => {
    console.log(req);
};

exports.gitlab = gitlab;
