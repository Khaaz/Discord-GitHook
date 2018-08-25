'use strict';

const { Logger } = require('../utils/Logger');

const config = require('../../configs/config.json');


const { promisify } = require('util');
const { join } = require('path');
const { writeFile } = require('fs');

// const readFilePromise = promisify(readFile);
const writeFilePromise = promisify(writeFile);


let ipbanned;
try {
    ipbanned = require('../../configs/ipbanned.json');
} catch (err) {
    /** Never ipbanned anyone */
    Logger.info('No ipbanned file found, creating one...');

    writeFilePromise(join(__dirname, '../../configs/ipbanned.json'), '[]', 'utf8')
        .then(Logger.info('File successfuly created'))
        .catch(err => {
            Logger.fatal(`Couldn't create the file:\n${err.stack}`);
        });

    ipbanned = [];
}

/**
 * Handle blacklisting IP accross all application.
 *
 * @author KhaaZ
 *
 * @class IPBlacklist
 */
class IPBanHandler {
    /**
     * Creates an instance of IPBlacklist.
     *
     * @prop {Object<Map>} defered - cache all onBan ips
     * @prop {Object<Set>} banned - cache all Banned ips
     * @memberof IPBlacklist
     */
    constructor() {
        /**
         * Map of onBan ips
         * ip => { count: number, maxCount: number }
         */
        this.defered = new Map();
        /**
         * Set of banned ips (avoid doubles)
         * Auto create with manually banned and ipbanned
         */
        this.banned = new Set([...config.blacklisted, ...ipbanned]);
    }

    /**
     * Update banCount for an ip
     * If it gets to maxCount, call banIP
     *
     * @param {String} ip - Ip to ban/countBan
     * @param {Number} [maxCount=3] - Max number of call to this method before a ban
     * @returns {Promise<Boolean>} true: worked | false: error
     * @memberof IPBlacklist
     */
    countBan(ip, maxCount = 3) {
        const warned = this.defered.get(ip) || this.defered.set(ip, { count: 0, maxCount });

        warned.count += 1;

        if (warned.count >= maxCount) {
            return this.banIP(ip);
        }
        return Promise.resolve(true);
    }

    /**
     * Ban an IP
     * Cache + JSON
     *
     * @param {String} ip
     * @returns {Boolean} true: worked | false: json update error
     * @memberof IPBlacklist
     */
    async banIP(ip) {
        this.defered.delete(ip);
        this.banned.add(ip);
        try {
            await this.updateAutobanned();
        } catch (err) {
            Logger.fatal(err.stack);
            return false;
        }
        Logger.notice(`AutoBanned ip: ${ip}`);
        return true;
    }


    async updateAutobanned() {
        try {
            await writeFilePromise(join(__dirname, '../../configs/ipbanned.json'), JSON.stringify([...this.banned]), 'utf8');
        } catch (err) {
            Logger.fatal('Couldn\'t update ipbanned.json!');
            throw err;
        }
    }
}

exports.IPBanHandler = new IPBanHandler();
