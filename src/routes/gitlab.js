'use strict';

// Others
// const config = require('../../configs/config.json');

// Const

const gitlab = (req, res) => {
    res.send('Success!');
    console.log(req);
};

exports.gitlab = gitlab;
