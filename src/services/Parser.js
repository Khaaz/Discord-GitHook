'use strict';

const colors = {
    pushEvent: 7506394,
    tagEvent: 1,
    mergeEvent: 7506394,
    issueEvent: 15426592,
};

class Parser {
    /**
     * Parse datas from gitlab into a discord embed form
     * First global parse constant datas
     * Then specific parse event specific datas
     *
     * @static
     * @param {Object} data - request data
     * @returns {Object} embed Object created from request datas
     * @memberof Parser
     */
    static parse(data) {
        const embed = {};

        /**
         * Parsing contant data
         */
        embed.author = {
            name: data.user_username,
            url: `https://gitlab.com/${data.user_username}`,
            icon_url: data.user_avatar,
        };

        embed.url = data.project.http_url;

        /** Base title */
        embed.title = `[${data.project.path_with_namespace}]`;

        /**
         * Parsing specific data
         */
        switch (data.object_kind) {
            case 'push': {
                return this.pushEvent(data, embed);
            }
            default: {
                //
            }
        }
    }

    static pushEvent(data, embed) {
        embed.title = `[${data.project.name}:${data.ref.split('/').pop()}]`;
        embed.title += ` ${data.total_commits_count} new commit${data.total_commits_count > 1 ? 's' : ''}`;

        const desc = [];
        for (const commit of data.commits) {
            const mess = (commit.message.length > 50) ? `${commit.message.slice(0, 47)}...` : commit.message;
            desc.push(`[\`${commit.id.slice(0, 6)}\`](${commit.url}) ${mess} - ${commit.author.name}`);
        }
        embed.description = (desc.length > 5) ? desc.splice(6, desc.length).join('\n') : desc.join('\n');

        embed.color = colors.pushEvent;

        return embed;
    }
}

exports.Parser = Parser;
