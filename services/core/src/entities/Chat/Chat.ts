// @ts-nocheck
import {logger} from '@shared';
import type { Redis } from 'ioredis';
import ConversationModel from '../../models/Conversation.model';
import moment from 'moment';
import {Notification} from '@lib';
import UserModel from '../../models/User.model';
import {User} from 'src/entities/User';
import {IChatMessage} from '../../interfaces/IChat';
import ChatMessageModel from '../../models/Chat.model';

export class Chat {

    constructor(private io: SocketIO.Server, private primaryCache: Redis) {
        io.on('connect', socket => {
            const userID = socket.handshake.query.userID;

            this.RegisterSocket(socket.id, userID);

            socket.on('new-conversation', args => {
                this.NewConversation(userID, args.receiverID);
            });

            socket.on('get-conversations', async args => {
                socket.emit('conversations', (await this.GetConversations(userID)));
            });

            socket.on('chat', async args => {
                const chatMessage: IChatMessage = {
                    createdAt: moment().valueOf(),
                    senderID: userID,
                    conversationID: args.conversationID,
                    receiverID: args.receiverID,
                    text:  args.text,
                };

                this.NewChat(chatMessage);
            });

            socket.on('get-pendingMessages', async args => {
                socket.emit('pending', (await this.GetPendingMessages(userID)));
            });

            socket.on('disconnect', async args => {
                this.CleanSocketRegistry(userID);
            })
        });
    }

    //
    public async NewConversation(senderID: string, receiverID: string) {
        // TODO: Show return text used to start conversation
        const exists = await ConversationModel.findOne({sender: senderID, receiver: receiverID}).exec();
        const conversationTimeStamp = moment().valueOf();
        if (exists === null) {
            let conversation = new ConversationModel({
                sender: senderID,
                receiver: receiverID,
                createdAt: conversationTimeStamp,
            });

            conversation = await conversation.save();

            const conversationID = conversation.id;
            // Add conversation to the receivers's list of conversations
            this.primaryCache.zadd(`conversations:${receiverID}`, conversationTimeStamp.toString(), conversationID);
            // Add conversation to sender's list of conversations
            this.primaryCache.zadd(`conversations:${senderID}`, conversationTimeStamp.toString(), conversationID);

            // Get receivers fcm token
            const receiverToken = await UserModel.findById(receiverID, {fcm_token: 1}).exec() as unknown as string;
            const Sender = await  UserModel.findById(senderID, {userTag: 1}).exec();
            // Notify the receiver about the message
            new Notification(receiverToken, {
                title: `New Conversation`,
                body: `${Sender.userTag} started a conversation with you`,
                sound: 'default',
            }, receiverID, Sender.userProfile.avatar, 'Conversation', Sender._id).SendPushNotification();
        }

    }

    public async GetConversations(userID: string) {
        const exist = await this.primaryCache.exists(userID);
        const select = {
            'userTag': 1,
            'userProfile.avatar': 1,
            'userProfile.university': 1,
            'userProfile.rep_points': 1,
            'name': 1,
            '_id': 1,
        };

        if (exist) {
            // TODO: set expiration
            let conversations = await this.primaryCache.zrevrange(`conversations:${userID}`, 0, -1);
            conversations = await ConversationModel.find({_id: {$in   : conversations}})
                .populate('sender', select)
                .populate('receiver', select)
                .lean().exec();
            return {conversations};
        } else {
            const conversations = await ConversationModel.find({senderID: userID})
                .populate('sender', select)
                .populate('receiver', select)
                .lean().exec();
            return {conversations};
        }
    }

    // public static async GetPending(userID) {
    //
    // }

    public async NewChat(chatMessage: IChatMessage)  {
        // Get receiver socketID
        const sID = await this.primaryCache.hget('OnlineSockets', chatMessage.receiverID);

        // Add to pending messages if the receiver is not online
        if (sID) {
            this.io.to(sID).emit(chatMessage.conversationID, chatMessage);
         } // else {
        //     const exist = this.primaryCache.exists(`pending:${chatMessage.receiverID}:${chatMessage.conversationID}`);
        //     if (exist) {
        //
        //     }
        //     this.primaryCache.sadd(`pending:${chatMessage.receiverID}:${chatMessage.conversationID}`, serializedMessage);
        //     this.primaryCache.zrem(`pending:${chatMessage.receiverID}:${chatMessage.conversationID}`);
        // }
        // new ChatMessageModel({
        //     senderID: chatMessage.senderID,
        //     receiverID: chatMessage.receiverID,
        //     text: chatMessage.text,
        //     video: null,
        //     image: null,
        //     createdAt: moment().valueOf(),
        // }).save();
    }

    public async GetPendingMessages(userID: string) {
        const messages = await this.primaryCache.zrevrange(`pending:${userID}`, 0, -1);
        return {messages};
    }

    private RegisterSocket(socket: string, userID: string) {
        this.primaryCache.hset('OnlineSockets', userID, socket);
    }

    private CleanSocketRegistry(userID: string) {
        this.primaryCache.hdel('OnlineSockets', userID);
    }
}