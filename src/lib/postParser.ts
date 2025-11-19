import { IPost } from '@interfaces';
import { logger } from '../shared';
const extract = require('mention-hashtag');

export class PostParser {
    constructor(private post: IPost) {

    }

    public async Parse() {
        try {
            const mentions = extract(this.post.text, 'all')

            const mentionedUsers: string[] = mentions.mentions;
            const hashTags: String[] = mentions.hashtags;

            return {
                mentionedUsers: {
                    mentionedUsers,
                    count: mentionedUsers.length
                },
                hashTags: {
                    hashTags,
                    count: hashTags.length,
                },
            }
        } catch (e) {
            logger.error(e);
        }
    }
}