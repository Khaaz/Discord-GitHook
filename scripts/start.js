'use strict';

const pm2 = require('pm2');

// Start process
console.log('>> Starting GitHub-Discord-HookRouter');
pm2.connect((err) => {
    if (err) {
        console.error(err);
        process.exit(2);
    }
    pm2.start({
        script: 'app.js',
        args: ['--color'],
        name: 'HookRouter',
        exec_mode : 'fork',
        max_memory_restart : '1G',
        cwd: 'src',
        error: 'logs/error.log',
        output: 'logs/output.log',
        pid: 'logs/pid.log',
        autorestart: true,
        wait_ready: true,
    }, (err) => {
        pm2.disconnect();
        if (err) throw err;
    });
});
//
