'use strict';

// Dependency
const express = require('express');

// Other
const { Logger } = require('../utils/Logger');
const { github } = require('./github');
const { gitlab } = require('./gitlab');
// const
const router = express.Router(); // eslint-disable-line

// BASE URL
router.get('/', (req, res) => {
    res.send('Hello World!');
});

// Redirecting post requests from base endpoint to github or gitlab functions
router.post('/', (req, res) => {
    try {
        if (req.headers['x-hub-signature']) {
            github(req, res);
        } else if (req.headers['x-gitlab-signature']) {
            gitlab(req, res);
        }
    } catch (err) {
        Logger.error(err.stack);
    }
});

//
router.post('/github', github);

router.post('/gitlab', gitlab);

exports.router = router;
