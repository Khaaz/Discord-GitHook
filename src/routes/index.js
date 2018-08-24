'use strict';

// Dependency
const express = require('express');

// const
const router = express.Router(); // eslint-disable-line

router.post('/', require('./root').root);


exports.router = router;
