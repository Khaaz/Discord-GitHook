'use strict';

const { Logger } = require('../../utils/Logger');

/**
 * Abstract Parser class, extended by any Parser
 *
 * @author KhaaZ
 *
 * @class Parser
 * @abstract
 */
class Parser {
    /**
     * Returns the type to type to use for parsing
     *
     * @param {Object} data
     * @returns {String}
     * @memberof Parser
     */
    getType() {
        throw new Error('Not Implemented');
    }

    /**
     * Create user object to use in webhook
     *
     * @returns {Object}
     * @memberof Parser
     */
    createUser() {
        return {
            username: 'Discord-Githook',
            avatar_url: null,
        };
    }

    /**
     * Returns the discord request for this payload formatted to be sent via webhook.
     *
     * @param {Object} data - Request payload for this provider
     * @returns {Object} Webhook DiscordRequest Object
     * @memberof Parser
     */
    parse(data) {
        const type = this.getType(data);
        const fn = this[type];
        if (!fn) {
            Logger.warn(`No implementation found for event: ${type}!`);
            return {
                title: 'ERROR',
                description: `Event not implemented: \`${type}\`!`,
                color: 16711680,
            };
        }
        const embed = fn.call(this, data);
        
        // If embed is null, doesn't create DiscordRequest because we don't want to relay the request to discord
        if (!embed || (Array.isArray(embed) && embed.length === 0) ) {
            return null;
        }

        const discordRequest = this.createUser();
        // handle case of multiple embed being returned when parsing
        if (Array.isArray(embed) ) {
            discordRequest.embeds = embed;
        } else {
            discordRequest.embeds = [embed];
        }
        Logger.verbose(`${this.constructor.name}: ${type} event.`);

        return discordRequest;
    }
}

exports.Parser = Parser;
