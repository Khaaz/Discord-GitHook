'use strict';

const colors = {
    pushEvent: 7506394,
    tagEvent: null,
    mergeOpenEvent: 38912,
    mergeCloseEvent: null,
    issueOpenEvent: 15426592,
    issueCloseEvent: null,
    issueComment: 15109472,
    prComment: 12576191,
};

const { Logger } = require('../utils/Logger');

class Parser {
    /**
     * Parses data from gitlab to a discord embed form
     * First global parser parses constant data
     * Then specific parser parses specific data
     *
     * @static
     * @param {Object} data - request data
     * @returns {Object} Embed Object created from request data
     * @memberof Parser
     */
    static parse(data) {
        const embeds = [];

        /** Base title */
        const embed = {};
        embed.title = `[${data.project.path_with_namespace}]`;

        /**
         * Parsing specific data
         */
        switch (data.object_kind) {
            case 'push': {
                return this.pushEvent(data, embed, embeds);
            }
            case 'tag_push': {
                return this.tagPushEvent(data, embed, embeds);
            }
            case 'issue': {
                embeds.push(this.issueEvent(data, embed));
                break;
            }
            case 'note': {
                embeds.push(this.commentEvent(data, embed));
                break;
            }
            case 'merge-request': {
                embeds.push(this.prEvent(data, embed));
                break;
            }
            default: {
                Logger.notice(`No matching case found for: ${data.object_kind}`);
            }
        }
        return embeds;
    }

    static pushEvent(data, embeds, embed) {
        // global
        embed.author = {
            name: data.user_username,
            url: `https://gitlab.com/${data.user_username}`,
            icon_url: data.user_avatar,
        };

        let embed2 = null;

        // specific
        if (this.zeroMatch(data.before)) { // new branch created
            if (data.commits.length > 0) { // commits
                // create a second (copying embed)
                embed2 = Object.assign({}, embed);
            }

            embed.title += `New branch created: ${data.ref.split('/').pop()}`;

            embeds.push(embed);
            return embeds;
        } else if (this.zeroMatch(data.after)) { // branch deleted
            embed.title += `Branch deleted: ${data.ref.split('/').pop()}`;

            embeds.push(embed);
            return embeds;
        }

        if (data.commits.length > 0) {
            const embedRef = embed2 || embed;
            embedRef.color = colors.pushEvent;

            embedRef.title = `[${data.project.name}:${data.ref.split('/').pop()}]`;
            embedRef.title += ` ${data.total_commits_count} new commit${data.total_commits_count > 1 ? 's' : ''}`;

            const desc = [];
            for (const commit of data.commits) {
                desc.push(`[\`${commit.id.slice(0, 6)}\`](${commit.url}) ${this.formatString(commit.message)} - ${commit.author.name}`);
            }
            embedRef.description = (desc.length > 5) ? desc.splice(6, desc.length).join('\n') : desc.join('\n');

            embedRef.url = `https://gitlab.com/${data.project.path_with_namespace}/commit/${data.after}/?view=parallel`;
        }

        embed2 ? embeds.push(embed, embed2) : embeds.push(embed);
        return embeds;
    }

    static tagPushEvent(data, embed) {
        // global
        embed.author = {
            name: data.user_username,
            url: `https://gitlab.com/${data.user_username}`,
            icon_url: data.user_avatar,
        };
        embed.color = colors.tagEvent;

        // specific
        const name = data.ref.split('/').pop();

        (data.commit.length !== 0)
            ? (embed.title += ` New tag created: ${this.formatString(name)}`)
            : (embed.title += ` tag deleted ${this.formatString(name)}`);

        return embed;
    }

    static issueEvent(data, embed) {
        // global
        embed.author = {
            name: data.user.username,
            url: `https://gitlab.com/${data.user.username}`,
            icon_url: data.user.avatar_url,
        };
        embed.url = data.object_attributes.url;

        // specific
        if (data.object_attributes.action === 'open') { // Issue open
            embed.title += ` Issue opened: #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
            embed.color = colors.issueOpenEvent;
        } else { // Issue close
            embed.title += ` Issue closed: #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
        }
        return embed;
    }

    static commentEvent(data, embed) {
        // global
        embed.author = {
            name: data.user.username,
            url: `https://gitlab.com/${data.user.username}`,
            icon_url: data.user.avatar_url,
        };
        embed.url = data.object_attributes.url;

        // specific
        embed.description = `${(data.object_attributes.note.length <= 801) ? data.object_attributes.note : `${data.object_attributes.note.slice(0, 800)}`}`;

        if (data.object_attributes.noteable_type === 'Commit') {
            embed.title += `New comment on commit \`${data.object_attributes.commit_id.slice(0, 6)}\``;
        } else if (data.object_attributes.noteable_type === 'MergeRequest') {
            embed.title += `New comment on pull request #${data.merge_request.iid}: ${this.formatString(data.merge_request.title)}`;
            embed.color = colors.prComment;
        } else if (data.object_attributes.noteable_type === 'Issue') {
            embed.title += `New comment on issue #${data.issue.iid}: ${this.formatString(data.issue.title)}`;
            embed.color = colors.issueComment;
        } else if (data.object_attributes.noteable_type === 'Snippet') {
            embed.title += `New comment on code snippet #${data.snippet.id}: ${this.formatString(data.snippet.title)}`;
        }

        return embed;
    }

    static prEvent(data, embed) {
        // global
        embed.author = {
            name: data.user.username,
            url: `https://gitlab.com/${data.user.username}`,
            icon_url: data.user.avatar_url,
        };
        embed.url = `https://gitlab.com/${data.project.path_with_namespace}/merge_requests/${data.object_attributes.iid}`;

        // specific
        if (data.object_attributes.state === 'opened') { // PR open
            embed.title += ` Pull Request opened: #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
            embed.description = `${(data.object_attributes.description.length <= 801) ? data.object_attributes.description : `${data.object_attributes.description.slice(0, 800)}`}`;
            embed.color = colors.mergeOpenEvent;
        } else { // PR close
            embed.title += ` Pull Request closed: #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
        }

        return embed;
    }

    static formatString(string) {
        return (string.length > 50) ? `${string.slice(0, 47)}...` : string;
    }

    static zeroMatch(string) {
        const zeroRE = /^0*$/;
        return zeroRE.test(string);
    }
}

exports.Parser = Parser;
