import CircleConversationModel from "../../models/CircleConversation.model";
import IORedis from 'ioredis';
import { logger } from "@shared";
import ioredis from "ioredis";
import { EventEmitter } from "events";
import moment from "moment";

export interface IConversationMessage {
    name: string;
    timestamp: number;
    conversationID: string;
    message: string
}

export const Emitter = new EventEmitter();

export class CircleConversation {
    private timestamp: number;

    constructor(private primaryCache: IORedis.Redis, private userID: string) {
        this.timestamp = moment().valueOf();
    }

    async createConversation(
        circleID: string, 
        memberID: string, 
        description: string,
        circlePost: string,
    ) {

        const newConversation = new CircleConversationModel({
            circle: circleID,
            description: description,
            circlePost: circlePost,
            moderator: [memberID],
            highlight: true 
        });

        const savedConversation = (await newConversation.save()).populate('circle');
        /**
         * Create redis set to contain conversations for this circle
         */
        // this.primaryCache.sadd(`circle-conversations:${circleID}`, savedConversation.id);
        /**
         * Mapping for circle users to their conversations
         */
        this.joinConversation(savedConversation.id)

        return savedConversation;
    }

    async joinConversation(conversationID: string) {
        /** 
         * Members that join a conversation should be added to a redis set 
        */
        try {
            this.primaryCache.zadd(`circle-c-users:${this.userID}`, this.timestamp.toString() , conversationID);
        } catch (err) {
            logger.error(err)
        }
    }

    async leaveConversation(conversationID: string){
          try {

            this.primaryCache.zrem(`circle-c-users:${this.userID}`, conversationID);

        } catch (err) {
            logger.error(err)
        }
    }

    async sendMessage(message: IConversationMessage) {
        
        const timestamp = moment().valueOf();

        message.timestamp = timestamp;
        const serializedMessage = JSON.stringify(message);

        this.primaryCache.zadd(`conversation-messages:${message.conversationID}`, timestamp.toString(), serializedMessage);
    }

    async getConversationMessages(conversationID: string) {
        const messages = await this.primaryCache.zrevrange(`conversation-messages:${conversationID}`, 0, -1);
        //TODO: Find an efficient way to this 
        const parsedMessages = messages.map(message => JSON.parse(message));

        return parsedMessages;
    }

    async getHighlightedConversations() {
        const highlighted = await this.primaryCache.zrevrange(`circle-c-users:${this.userID}`, 0, -1 );

        const conversations = await CircleConversationModel.find({_id: {$in: highlighted}}).populate('circle').sort({createdAt: -1}).exec();

        return conversations;
    }

}