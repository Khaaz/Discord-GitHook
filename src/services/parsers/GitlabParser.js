/* eslint-disable camelcase */
'use strict';

const { Parser } = require('./Parser');

const COLORS = {
    PUSH: 7506394,
    PUSH_FORCE: 16525609,
    PUSH_TAG: null,
    MR_OPEN: 38912,
    MR_CLOSE: null,
    MR_REOPEN: null,
    MR_UPDATE: null,
    ISSUE_OPEN: 15426592,
    ISSUE_CLOSE: null,
    ISSUE_REOPEN: null,
    ISSUE_UPDATE: null,
    NOTE_MR: 12576191,
    NOTE_ISSUE: 15109472,
    NOTE_COMMIT: null,
    NOTE_SNIPPET: null,
    WIKI_CREATE: 4483904,
    WIKI_DELETE: 12340029,
    WIKI_UPDATE: null,
    PIPELINE_RUNNING: 16771840,
    PIPELINE_SUCESS: 65280,
    PIPELINE_FAILED: 16711680,
    BUILD_SUCESS: 65280,
    BUILD_FAILED: 16711680,
};
const MAX_SIZE_DESCRIPTION = 800;

const ZEROS_RE = /^0*$/;
const LB_RE = /(\r\n\t|\n|\r\t)/gm;
const DOMAIN_RE = /^http[s]?:\/\/.*?\//; // non-greedy lookup

/**
 * Specific parser for Gitlab
 *
 * @author KhaaZ
 *
 * @class GitlabParser
 * @extends {Parser}
 */
class GitlabParser extends Parser {
    // override
    createUser() {
        return {
            username: 'Gitlab',
            avatar_url: 'https://gitlab.com/gitlab-com/gitlab-artwork/raw/master/logo/logo.png',
        };
    }
    
    // override
    getType(data) {
        return data.object_kind;
    }

    createAuthorPush(data) {
        return {
            name: data.user_username,
            url: `${this.getDomain(data.project.web_url)}${data.user_username}`,
            icon_url: data.user_avatar,
        };
    }

    createAuthor(data) {
        return {
            name: data.user.username,
            url: `${this.getDomain(data.project.web_url)}${data.user.username}`,
            icon_url: data.user.avatar_url,
        };
    }

    /**
     * Get gitlab instance domain url.
     * Needs to be done dynamically for selfhosted gitlab instances.
     *
     * @param {String} string
     * @returns {String} URL
     * @memberof GitlabParser
     */
    getDomain(string) {
        const match = DOMAIN_RE.exec(string);
        return match
            ? match[0]
            : 'https://gitlab.com/';
    }

    getBranch(data) {
        return data.ref.split('/').pop();
    }

    push(data) {
        const embed = {};
        embed.author = this.createAuthorPush(data);

        let embedBranch = null;

        const branchName = this.getBranch(data);

        // Branch deleted
        if (this.zeroMatch(data.after) ) {
            embed.title = `[${data.project.path_with_namespace}] Branch deleted: ${branchName}`;

            return embed;
        }

        // Branch created
        if (this.zeroMatch(data.before) ) {
            embedBranch = Object.assign( {}, embed);
            embedBranch.title = `[${data.project.path_with_namespace}] New branch created: ${branchName}`;
        }

        if (data.commits.length > 0) { // commits
            embed.color = COLORS.PUSH;
            embed.url = `${data.project.homepage}/commit/${data.after}/?view=inline`;
            
            embed.title = `[${data.project.name}:${branchName}] ${data.total_commits_count} new commit${data.total_commits_count > 1 ? 's' : ''}`;

            const desc = [];
            for (const commit of data.commits) {
                desc.push(`[\`${commit.id.slice(0, 6)}\`](${commit.url}?view=inline) ${this.removeLinebreak(this.formatString(String(commit.message) ) )} - ${commit.author.name.trim()}`);
            }
            embed.description = (desc.length > 5)
                ? desc.slice(0, 5).join('\n')
                : desc.join('\n');
        } else if (data.commits.length === 0) { // force push
            embed.color = COLORS.PUSH_FORCE;

            embed.title = `[${data.project.name}] Branch ${branchName} was force pushed to \`${data.after.slice(0, 6)}\``;

            embed.description = `[Compare changes](${data.project.homepage}/commit/${data.after}?view=inline)`;
        }

        return embedBranch
            ? [embedBranch, embed]
            : embed;
    }

    tag_push(data) {
        const embed = {};
        embed.author = this.createAuthorPush(data);

        embed.title = `[${data.project.path_with_namespace}] `;
        embed.color = COLORS.PUSH_TAG;

        const name = this.formatString(this.getBranch(data) );

        (data.commits.length !== 0)
            ? (embed.title += `New tag created: ${name}`)
            : (embed.title += `Tag deleted ${name}`);

        return embed;
    }

    issue(data) {
        const embed = {};
        embed.author = this.createAuthor(data);
        embed.title = `[${data.project.path_with_namespace}] `;
        embed.url = data.object_attributes.url;

        embed.title += 'Issue ';
        if (data.object_attributes.action === 'open') {
            embed.title += 'opened:';
            embed.description = this.formatString(data.object_attributes.description, MAX_SIZE_DESCRIPTION);
            embed.color = COLORS.issueOpenEvent;
        } else if (data.object_attributes.action === 'reopen') {
            embed.title += 'reopened:';
            embed.color = COLORS.ISSUE_REOPEN;
        } else if (data.object_attributes.action === 'close') {
            embed.title += 'closed:';
            embed.color = COLORS.ISSUE_CLOSE;
        } else {
            embed.title += 'updated:';
            embed.color = COLORS.ISSUE_UPDATE;
        }
        embed.title += ` #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;
        
        return embed;
    }

    merge_request(data) {
        const embed = {};
        embed.author = this.createAuthor(data);
        embed.title = `[${data.project.path_with_namespace}] `;
        embed.url = `${data.project.homepage}/merge_requests/${data.object_attributes.iid}`;

        embed.title += 'Merge Request ';
        if (data.object_attributes.action === 'open') {
            embed.title += 'opened:';
            embed.description = this.formatString(data.object_attributes.description, MAX_SIZE_DESCRIPTION);
            embed.color = COLORS.MR_OPEN;
        } else if (data.object_attributes.action === 'reopen') {
            embed.title += 'reopened:';
            embed.color = COLORS.MR_REOPEN;
        } else if (data.object_attributes.action === 'close') {
            embed.title += 'closed:';
            embed.color = COLORS.MR_CLOSE;
        } else {
            embed.title += 'updated:';
            embed.color = COLORS.MR_UPDATE;
        }
        embed.title += ` #${data.object_attributes.iid} ${this.formatString(data.object_attributes.title)}`;

        return embed;
    }

    note(data) {
        const embed = {};
        embed.author = this.createAuthor(data);
        embed.title = `[${data.project.path_with_namespace}] `;
        embed.url = data.object_attributes.url;

        embed.description = this.formatString(data.object_attributes.note, MAX_SIZE_DESCRIPTION);
        
        embed.title += 'New comment on ';
        if (data.object_attributes.noteable_type === 'Commit') {
            embed.title += `commit \`${data.object_attributes.commit_id.slice(0, 6)}\``;
            embed.color = COLORS.NOTE_COMMIT;
        } else if (data.object_attributes.noteable_type === 'MergeRequest') {
            embed.title += `pull request #${data.merge_request.iid}: ${this.formatString(data.merge_request.title)}`;
            embed.color = COLORS.NOTE_MR;
        } else if (data.object_attributes.noteable_type === 'Issue') {
            embed.title += `issue #${data.issue.iid}: ${this.formatString(data.issue.title)}`;
            embed.color = COLORS.NOTE_ISSUE;
        } else if (data.object_attributes.noteable_type === 'Snippet') {
            embed.title += `code snippet #${data.snippet.id}: ${this.formatString(data.snippet.title)}`;
            embed.color = COLORS.NOTE_SNIPPET;
        }

        return embed;
    }

    wiki_page(data) {
        const embed = {};
        embed.author = {
            name: data.project.path_with_namespace,
            url: data.project.web_url,
            icon_url: data.project.avatar_url,
        };

        embed.title = `[WIKI PAGE] `;
        embed.url = `${data.wiki.web_url}`;

        embed.title += 'Wiki page ';
        if (data.object_attributes.action === 'create') {
            embed.title += 'created:';
            embed.description = this.formatString(data.object_attributes.content, MAX_SIZE_DESCRIPTION);
            embed.color = COLORS.WIKI_CREATE;
        } else if (data.object_attributes.action === 'update') {
            embed.title += 'updated:';
            embed.color = COLORS.WIKI_UPDATE;
        } else {
            embed.title += 'deleted';
            embed.color = COLORS.WIKI_DELETE;
        }
        embed.title += ` ${data.object_attributes.title}`;

        return embed;
    }

    pipeline(data) {
        const embed = {};
        embed.url = data.commit.url;

        embed.title = `[${data.project.namespace}/${data.project.name}#${data.object_attributes.ref}] Pipeline `;
        if (data.object_attributes.status === 'success') {
            embed.title += '**successful**';
            embed.color = COLORS.PIPELINE_SUCESS;
        } else if (data.object_attributes.status === 'failed') {
            embed.title += '**failed**';
            embed.color = COLORS.PIPELINE_FAILED;
        } else if (data.object_attributes.status === 'running') {
            embed.title += '**running**';
            embed.color = COLORS.PIPELINE_RUNNING;
        } else {
            return null; // pending event
        }
        const stages = data.object_attributes.stages.length;
        embed.title += ` with ${stages} stage${stages > 1 ? 's' : ''}!`;
        
        return embed;
    }

    build(data) {
        const embed = {};
        embed.url = `${data.repository.homepage}/-/jobs/${data.build_id}`;

        embed.title = `[${data.repository.name}#${data.ref}] Build `;
        if (data.build_status === 'success') {
            embed.title += '**successful**:';
            embed.color = COLORS.BUILD_SUCESS;
        } else if (data.build_status === 'failed') {
            embed.title += '**failed**:';
            embed.color = COLORS.BUILD_FAILED;
        } else {
            return null; // created / running events
        }
        embed.title += ` ${data.build_name}.`;

        return embed;
    }

    // cleanup string and make sure it doesn't go above limit
    // eslint-disable-next-line no-magic-numbers
    formatString(string, maxLength = 50) {
        return (string.length > maxLength) ? `${string.slice(0, maxLength - 3).trim()}...` : string.trim();
    }

    removeLinebreak(string) {
        return string.replace(LB_RE, ' ');
    }

    zeroMatch(string) {
        return ZEROS_RE.test(string);
    }
}

exports.GitlabParser = GitlabParser;
