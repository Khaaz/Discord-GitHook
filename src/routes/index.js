'use strict';

// Dependency
const express = require('express');

// const
const router = express.Router(); // eslint-disable-line

router.post('/github', require('./github').github);

router.post('/gitlab', require('./gitlab').gitlab);

exports.router = router;
