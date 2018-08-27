'use strict';

const { Logger } = require('../utils/Logger');

const colors = {
    pushEvent: 7506394,
    tagEvent: null,
    mergeOpenEvent: 38912,
    mergeCloseEvent: null,
    mergeCommentEvent: 12576191,
    issueOpenEvent: 15426592,
    issueCloseEvent: null,
    issueCommentEvent: 15109472,
    wikiCreateEvent: 4483904,
    wikiDeleteEvent: 12340029,
};


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

        const embed = {};

        /**
         * Parsing specific data
         */
        switch (data.object_kind) {
            case 'push': {
                return this.pushEvent(data, embed, embeds);
            }
            case 'tag_push': {
                embeds.push(this.tagPushEvent(data, embed, embeds));
                break;
            }
            case 'issue': {
                embeds.push(this.issueEvent(data, embed));
                break;
            }
            case 'merge_request': {
                embeds.push(this.prEvent(data, embed));
                break;
            }
            case 'note': {
                embeds.push(this.commentEvent(data, embed));
                break;
            }
            case 'wiki_page': {
                embeds.push(this.wikiEvent(data, embed));
                break;
            }
            case 'pipeline': {
                embed.title = `[${data.project.path_with_namespace}] PIPELINE Event`;
                embed.description = 'Unsupported event';
                embeds.push(embed);
                break;
            }
            case 'build': {
                embed.title = `[${data.project_name}] BUILD Event`;
                embed.description = 'Unsupported event';
                embeds.push(embed);
                break;
            }
            default: {
                Logger.warn(`No matching case found for: ${data.object_kind}`);
                const errEmbed = {
                    /*
                    author: {
                        name: data.user_username || data.user.username,
                        url: `https://gitlab.com/${data.user_username || data.user.username}`,
                        icon_url: data.user_avatar || data.user.avatar_url,
                    },
                    */
                    title: 'ERROR',
                    description: 'No Matching Case Found!',
                    color: 16711680,
                };
                embeds.push(errEmbed);
            }
        }
        return embeds;
    }

    static pushEvent(data, embed, embeds) {
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

            embed.title = `[${data.project.path_with_namespace}] New branch created: ${data.ref.split('/').pop()}`;
        } else if (this.zeroMatch(data.after)) { // branch deleted
            embed.title = `[${data.project.path_with_namespace}] Branch deleted: ${data.ref.split('/').pop()}`;

            embeds.push(embed);
            return embeds;
        }

        if (data.commits.length > 0) {
            const embedRef = embed2 || embed;
            embedRef.color = colors.pushEvent;

            embedRef.title = `[${data.project.name}:${data.ref.split('/').pop()}] `;
            embedRef.title += `${data.total_commits_count} new commit${data.total_commits_count > 1 ? 's' : ''}`;

            const desc = [];
            for (const commit of data.commits) {
                desc.push(`[\`${commit.id.slice(0, 6)}\`](${commit.url}) ${this.formatString(String(commit.message))} - ${commit.author.name.trim()}`);
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
        embed.title = `[${data.project.path_with_namespace}] `;
        embed.color = colors.tagEvent;

        // specific
        const name = data.ref.split('/').pop();

        (data.commits.length !== 0)
            ? (embed.title += `New tag created: ${this.formatString(name)}`)
            : (embed.title += `Tag deleted ${this.formatString(name)}`);

        return embed;
    }

    static issueEvent(data, embed) {
        // global
        embed.author = {
            name: data.user.username,
            url: `https://gitlab.com/${data.user.username}`,
            icon_url: data.user.avatar_url,
        };
        embed.title = `[${data.project.path_with_namespace}] `;
        embed.url = data.object_attributes.url;

        // specific
        if (data.object_attributes.action === 'open') { // Issue open
            embed.title += `Issue opened: #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
            embed.description = this.formatString(data.object_attributes.description, 800);
            embed.color = colors.issueOpenEvent;
        } else if (data.object_attributes.action === 'reopen') {
            embed.title += `Issue reopened: #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
        } else { // Issue close
            embed.title += `Issue closed: #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
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
        embed.title = `[${data.project.path_with_namespace}] `;
        embed.url = `https://gitlab.com/${data.project.path_with_namespace}/merge_requests/${data.object_attributes.iid}`;

        // specific
        if (data.object_attributes.action === 'open') { // PR open
            embed.title += `Merge Request opened: #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
            embed.description = this.formatString(data.object_attributes.description, 800);
            embed.color = colors.mergeOpenEvent;
        } else if (data.object_attributes.action === 'reopen') {
            embed.title += `Merge Request reopened: #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
        } else { // PR close
            embed.title += `Merge Request closed: #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
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
        embed.title = `[${data.project.path_with_namespace}] `;
        embed.url = data.object_attributes.url;

        // specific
        embed.description = this.formatString(data.object_attributes.note, 800);

        if (data.object_attributes.noteable_type === 'Commit') {
            embed.title += `New comment on commit \`${data.object_attributes.commit_id.slice(0, 6)}\``;
        } else if (data.object_attributes.noteable_type === 'MergeRequest') {
            embed.title += `New comment on pull request #${data.merge_request.iid}: ${this.formatString(data.merge_request.title)}`;
            embed.color = colors.mergeCommentEvent;
        } else if (data.object_attributes.noteable_type === 'Issue') {
            embed.title += `New comment on issue #${data.issue.iid}: ${this.formatString(data.issue.title)}`;
            embed.color = colors.issueCommentEvent;
        } else if (data.object_attributes.noteable_type === 'Snippet') {
            embed.title += `New comment on code snippet #${data.snippet.id}: ${this.formatString(data.snippet.title)}`;
        }

        return embed;
    }

    static wikiEvent(data, embed) {
        embed.author = {
            name: data.project.path_with_namespace,
            url: data.project.web_url,
            icon_url: data.project.avatar_url,
        };

        embed.title = `[WIKI PAGE] `;
        embed.url = `${data.wiki.web_url}`;

        if (data.object_attributes.action === 'create') {
            embed.title += `Wiki page created: ${data.object_attributes.title}`;
            embed.description = this.formatString(data.object_attributes.content, 800);
            embed.color = colors.wikiCreateEvent;
        } else if (data.object_attributes.action === 'update') {
            embed.title += `Wiki page updated: ${data.object_attributes.title}`;
        } else {
            embed.title += `Wiki page deleted: ${data.object_attributes.title}`;
            embed.color = colors.wikiDeleteEvent;
        }

        return embed;
    }

    static formatString(string, maxLength = 50) {
        return (string.length > maxLength) ? `${string.slice(0, maxLength - 3).trim()}...` : string.trim();
    }

    static zeroMatch(string) {
        const zeroRE = /^0*$/;
        return zeroRE.test(string);
    }
}

exports.Parser = Parser;
