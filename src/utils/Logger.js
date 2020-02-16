'use strict';

const { Console } = require('console');
const { format } = require('util');

/**
 * Default Logger with time and custom method
 * Allow clean logging without any dependency
 *
 * @author KhaaZ
 *
 * @class DefLogger
 * @extends {Console}
 */
class Logger extends Console {
    constructor() {
        super(process.stdout, process.stderr); // Create default Console instance - Node v8 support
    }

    /**
     * Major - Critical fault
     * Crashing bugs, unexpected...
     *
     * @param {String} input
     * @memberof Logger
     */
    fatal(input) {
        const mess = `${this.parseTime()} - [ FATAL ] => ${input}`;
        super.error(mess);
    }

    /**
     * Major - critical error
     *
     * @param {String} input
     * @memberof Logger
     */
    error(input) {
        const mess = `${this.parseTime()} - [ ERROR ] => ${input}`;
        super.error(mess);
    }

    /**
     * Warns - non critcal
     * Expected errors
     *
     * @param {String} input
     * @memberof Logger
     */
    warn(input) {
        const mess = `${this.parseTime()} - [ WARN  ] => ${input}`;
        super.warn(mess);
    }

    /**
     * Eval - Debugging logs
     *
     * @param {String} input
     * @memberof Logger
     */
    debug(input) {
        const mess = `${this.parseTime()} - [ DEBUG ] => ${input}`;
        this.log(mess);
    }

    /**
     * Important informations
     *
     * @param {String} input
     * @memberof Logger
     */
    notice(input) {
        const mess = `${this.parseTime()} - [NOTICE ] => ${input}`;
        this.log(mess);
    }

    /**
     * Default informations
     *
     * @param {String} input
     * @memberof Logger
     */
    info(input) {
        const mess = `${this.parseTime()} - [ INFO  ] => ${input}`;
        this.log(mess);
    }

    /**
     * Other Logging
     * Commands usage...
     *
     * @param {String} input
     * @memberof Logger
     */
    verbose(input) {
        const mess = `${this.parseTime()} - [VERBOSE] => ${input}`;
        this.log(mess);
    }


    parseTime() {
        const current = new Date();
        const formated = format('[ %s ]', `${current.getHours()}h:${current.getMinutes()}m:${current.getSeconds()}s`);
        return formated;
    }
}

exports.Logger = new Logger();
