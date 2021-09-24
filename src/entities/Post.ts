import PostModel from "../models/Post.model";
import UserModel from "../models/User.model";
import { IComment, IPost } from "../interfaces/IPost";
import { logger } from "@shared";
import FollowsModel, { IFollower } from "../models/Follower.model";
import * as IORedis from "ioredis";
import CommentModel from "../models/Comment.model";
import { S3, Utility } from "@lib";
import { Types } from "mongoose";
import moment from "moment";
import CirclePostModel from "../models/CirclePost.model";
import { AggregationQueries } from "@lib";
import { Notification } from "../lib/notifications";
import { IUser } from "../interfaces/IUser";
import EventEmitter from "events";
import { Newsfeed } from "../lib/newsfeeds";
import { PostParser } from "../lib/postParser";
import { bool } from "aws-sdk/clients/signer";

interface IOptions {
  mostRecent?: boolean;
  first100?: boolean;
  offset: number;
  limit: number;
}

export interface IPostOptions {
  anonymous?: string;
  campusReflect?: string;
}

interface IPostType {
  name: string;
}

export const feedEmitter1 = new EventEmitter();

// enum PostTypes {
//     name = 'REPOST',
// }
export class Post {
  /**
   *
   * @param postObject - Object that contains the post
   * @param userID - users ID
   * @param primaryCache - Redis instance
   * @param options - {
   *     campusReflect: decides if the user's post should appear in the campus timeline
   * }
   * @constructor
   */
  public static async CreatePost(
    postObject: IPost,
    userID: string,
    primaryCache: IORedis.Redis,
    options: IPostOptions
  ) {
    try {
      const parsedPost = await new PostParser(postObject).Parse();

      const mentioned = parsedPost.mentionedUsers.mentionedUsers;
      const hashTags = parsedPost.hashTags.hashTags;

      // tslint:disable-next-line: no-shadowed-variable
      let post = new PostModel({
        author: options.anonymous === String("true") ? null : postObject.author,
        text: postObject.text,
        campus: postObject.campus,
        parentPost: postObject.parentPost,
        createdAt: moment().valueOf(),
        hashTags,
        mentions: mentioned,
      });
5
      if (postObject.image !== undefined) {
        const s3 = new S3(post.id + "image", postObject.image, "image");
        post.image = (await s3.UploadImage()) as string;
      }

      if (postObject.video !== undefined) {
        const s3 = new S3(post.id + "video", postObject.video, "video");
        post.video = (await s3.UploadVideo()) as string;
      }

      post = await post.save();

      // Update the post_count in users document
      const author = await UserModel.findOneAndUpdate(
        { _id: userID },
        { $inc: { "userProfile.post_count": 1 } }
      )
        .lean()
        .exec();

      const followers: IFollower[] = await FollowsModel.find({ target: userID })
        .lean()
        .exec();
      /**
       * Small art of descriptions here to add post to the user's feed
       */
      followers.push({ target: null, follower: userID } as IFollower);

      //  Offload this work to another thread
      const pipeline = primaryCache.pipeline();
      for (const follower of followers) {
        // primaryCache.lpush(follower.follower, post.id);
        const ttl_time = process.env.POST_EXPIRE;
        const ttl_unit = process.env.POST_EXPIRE_UNIT as any;
        const expiryTime = process.env.POST_EXPIRE as any;
        const expiryUnit = process.env.POST_EXPIRE_UNIT as any;
        const ttl = moment().utc().add(ttl_time, ttl_unit).valueOf();
        pipeline.zadd(follower.follower.toString(), ttl.toString(), post.id);

        Utility.CacheExpiryTracker(
          `ExpiredPosts`,
          `${follower.follower}:${post.id}`,
          expiryTime,
          expiryUnit,
          primaryCache
        );
      }

      // Add campus name to list of campuses
      // TODO: Find a better way to rank active campuses
      pipeline.zadd("campuses", "0", postObject.campus);

      if (options.campusReflect === String("true")) {
        // Add post to campus timeline
        pipeline.zadd(
          `campusFeed:${postObject.campus}`,
          "0",
          `${postObject.campus}:${post.id}`
        );

      }
      pipeline.exec();

      // Expiry values
      const expTime = parseInt(process.env.CAMPUS_T_EXPIRY_TIME, 10);
      const expUnit = process.env.CAMPUS_T_EXPIRY_UNIT as any;

      // Keep track of postIDs to remove from campus timeline
      Utility.CacheExpiryTracker(
        "campusFeedExpiry",
        `${postObject.campus}:${post.id}`,
        expTime,
        expUnit,
        primaryCache
      );

      if (mentioned.length !== 0) {
        const users = await UserModel.find(
          { userTag: { $in: mentioned } },
          { password: 0 }
        )
          .lean()
          .exec();

        users.forEach((user: IUser) => {
          new Notification(
            user.fcm_token,
            {
              body: `${post.text}`,
              title: `${author.userTag} mentioned you`,
            },
            user._id,
            user.userProfile.avatar,
            "mention",
            author._id,
          ).SendPushNotification();
        });
      }

      // Get post from DB
      const newPost = await AggregationQueries.GetPost(post._id);

      /**
       * Setup redis pipeline to get all user's followers that are connected
       */
      const p = primaryCache.pipeline();

      for (const follower of followers) {
        p.get(`socketID:${follower.follower}`);
      }

      const result = await p.exec();

      // filter errors
      const filteredIDs = result.map((r) => r[1]);
      feedEmitter1.emit("pull-socketIDs", { filteredIDs, post: newPost });
    } catch (error) {
      logger.error(error);
    }
  }

  public static async GetPosts(
    primaryCache: IORedis.Redis,
    userID: string,
    options: IOptions
  ) {
    if (options!.mostRecent) {
      try {
        /**
         *  Check the cache for newsfeed
         */
        const exists = (await primaryCache.exists(userID)) === 1;

        if (exists) {
          const unixNow = moment().utc().valueOf();
          // Remove expired posts
          primaryCache.zremrangebyscore(userID, 0, unixNow);

          // Get all the postIDs in the users newsfeed
          const postKeys = await primaryCache.zrevrange(userID, 0, -1);

          // Since feed has been retrieved, remove it from set of dirty feeds

          // Convert all keys to objectIDs
          const objectIDs = postKeys.map((key) => Types.ObjectId(key));

          // Hydrate the feed list (Get posts with the keys retrieved)
          const newsfeed = await this.Hydrate(objectIDs, userID);

          // const posts = await primaryCache.
          return { newsfeed };
        } else {
          return { error_msg: "Feed is empty, follow some folks " };
          //  Find a way to get posts for users that have not been online in a while
        } // else {
        //     // TODO: Optimize this block

        //     // Get people user follows
        //     const followings = await FollowsModel.find({
        //         follower: userID,
        //     }, { target: 1 }).lean().exec();

        //     //  TODO: A worker should be spawned to do tasks from here
        //     const arr: string[] = [];

        //     followings.forEach((x: { target: string; }) => {
        //         arr.push(x.target);
        //     });

        //     const newsfeed = await PostModel.find({ author: { $in: arr } }).limit(800).sort({ createdAt: -1 }).exec();

        //     const pipeline =  primaryCache.pipeline();

        //     const ttl_time = process.env.POST_EXPIRE;
        //     const ttl_unit = process.env.POST_EXPIRE_UNIT as any;
        //     const ttl = moment().utc().add(ttl_time, ttl_unit).valueOf();

        //     for (let index = 0; index < newsfeed.length; index++) {
        //         const post = newsfeed[index];
        //         pipeline.zadd(userID, ttl.toString(), post.id);
        //     }

        //     pipeline.exec();

        //     return { newsfeed };
        // }
      } catch (error) {
        logger.error(error);
      }
    }
  }

  public static async LikePost(
    userID: string,
    postID: string,
    collection: string,
    primaryCache: IORedis.Redis,
    fcm_token: string
  ) {
    try {
      let likedBy: any;
      const findLikedByQuery = { _id: postID, likedBy: { $in: [userID] } };
      const updateLikeQuery = {
        $inc: { likes: 1 },
        $push: { likedBy: userID },
      };
      const updateUserQuery = { $inc: { "userProfile.rep_points": 0.25 } };
      let userFcmToken: string;
      let author;

      switch (collection) {
        case "post":
          likedBy = await PostModel.findOne(findLikedByQuery).lean().exec();
          break;

        case "comment":
          likedBy = await CommentModel.findOne(findLikedByQuery).lean().exec();
          break;

        case "circlePost":
          likedBy = await CirclePostModel.findOne(findLikedByQuery)
            .lean()
            .exec();
          break;

        default:
          break;
      }

      if (likedBy === null) {
        // Actor is the user interacting with the post
        const actor = await UserModel.findById(userID).lean().exec();
        switch (collection) {
          case "post":
            const post = await PostModel.findByIdAndUpdate(
              postID,
              updateLikeQuery
            )
              .lean()
              .exec();
            userFcmToken = (
              await UserModel.findById(post.author, {
                fcm_token: 1,
                _id: 0,
              })
                .lean()
                .exec()
            ).fcm_token;
            author = await UserModel.findByIdAndUpdate(
              post.author,
              updateUserQuery
            ).exec();
            new Notification(
              userFcmToken,
              {
                body: post.text !== undefined ? post.text : "Media",
                title: `${actor.userTag} liked your post`,
                sound: "default",
                data: post._id,
              },
              author.id,
              actor.userProfile.avatar,
              "like",
              actor._id,

            ).SendPushNotification();

            return { result: "liked" };

          case "comment":
            const comment = await CommentModel.findByIdAndUpdate(
              postID,
              updateLikeQuery
            )
              .lean()
              .exec();
            if (comment === null) {
              throw new Error("Cannot find comment");
            } else {
              author = await UserModel.findByIdAndUpdate(
                comment.author,
                updateUserQuery
              )
                .lean()
                .exec();
              new Notification(
                fcm_token,
                {
                  body: comment.text !== undefined ? comment.text : "Media",
                  title: `${actor.userTag} liked your comment`,
                  sound: "default",
                  data: comment._id,
                },
                author.id,
                actor.userProfile.avatar,
                "like",
                actor._id,
              ).SendPushNotification();
              return { result: "liked" };
            }

          case "circlePost":
            const circlePost = await CirclePostModel.findByIdAndUpdate(
              postID,
              updateLikeQuery
            )
              .lean()
              .exec();
            UserModel.findByIdAndUpdate(
              circlePost.author,
              updateUserQuery
            ).exec();
            return { result: "liked" };

          default:
            break;
        }
      } else {
        const updateUnLikeQuery = {
          $inc: { likes: -1 },
          $pull: { likedBy: { $in: [userID] } },
        };
        const updateUserQueryNegate = {
          $inc: { "userProfile.rep_points": -0.25 },
        };

        switch (collection) {
          case "post":
            // TODO: Remove userID from list
            const post = await PostModel.findByIdAndUpdate(
              postID,
              updateUnLikeQuery
            )
              .lean()
              .exec();
            UserModel.findByIdAndUpdate(
              post.author,
              updateUserQueryNegate
            ).exec();
            return { result: "unliked" };
          case "comment":
            const comment = await CommentModel.findByIdAndUpdate(
              postID,
              updateUnLikeQuery
            )
              .lean()
              .exec();
            UserModel.findByIdAndUpdate(
              comment.author,
              updateUserQueryNegate
            ).exec();
            return { result: "unliked" };
          case "circlePost":
            const circlePost = await CirclePostModel.findByIdAndUpdate(
              postID,
              updateUnLikeQuery
            )
              .lean()
              .exec();
            UserModel.findByIdAndUpdate(
              circlePost.author,
              updateUserQueryNegate
            ).exec();
            return { result: "unliked" };
          default:
            break;
        }
      }
    } catch (error) {
      logger.error(error);
      throw new Error(error);
    }
  }

  public static async DislikePost(
    userID: string,
    postID: string,
    postCache: IORedis.Redis
  ) {
    // TODO: Check if post has been disliked already, if it has, undislike it, check if it has been liked too
    try {
      PostModel.findByIdAndUpdate(postID, { $inc: { dislikes: 1 } }).exec();
      UserModel.findByIdAndUpdate(userID, {
        $inc: { "userProfile.rep_points": 0.2 },
      }).exec();
      postCache.hincrby(postID, "likes", 1);

      return 0;
    } catch (error) {
      throw new Error(error);
    }
  }

  public static async Comment(
    commentObject: IComment,
    fcm_token: string,
    primaryCache: IORedis.Redis
  ) {
    try {
      let authorOfPost;

      if (commentObject.type === "reply") {
        authorOfPost = await CommentModel.findByIdAndUpdate(
          commentObject.parentPost,
          {
            $inc: {
              comments: 1,
            },
          }
        )
          .lean()
          .exec();
      } else {
        authorOfPost = await PostModel.findByIdAndUpdate(
          commentObject.parentPost,
          {
            $inc: {
              comments: 1,
            },
          }
        )
          .lean()
          .exec();
      }

      const user = await UserModel.findById(commentObject.author).exec();

      const mentions = await new PostParser(commentObject).Parse();
      const mentionedUsers = mentions.mentionedUsers.mentionedUsers;
      const hashTags = mentions.hashTags.hashTags;

      const newComment = {
        commentID: "",
        campus: commentObject.campus,
        text: commentObject.text,
        video: commentObject.video,
        image: commentObject.image,
        parentPost: commentObject.parentPost,
        author: commentObject.author,
        createdAt: moment().valueOf(),
        type: commentObject.type,
        hashTags,
        mentions: mentionedUsers,
      } as IComment;

      const comment = new CommentModel(newComment);
      comment.commentID = comment.id;
      comment.save();

      // Get fcm_token of the recipient
      new Notification(
        fcm_token,
        {
          body: commentObject.text !== undefined ? commentObject.text : "Media",
          title:
            commentObject.type === "reply"
              ? `${user.userTag} replied your comment`
              : `${user.userTag} commented on your post`,
          data: comment._id,
        },
        authorOfPost.author,
        user.userProfile.avatar,
        "comment",
        user._id
      ).SendPushNotification();

      // Notify mentioned users
      if (mentionedUsers.length !== 0) {
        const users = await UserModel.find(
          { userTag: { $in: mentionedUsers } },
          { password: 0 }
        )
          .lean()
          .exec();

        users.forEach((user0: IUser) => {
          new Notification(
            user0.fcm_token,
            {
              body: `${comment.text}`,
              title: `${user.userTag} mentioned you`,
            },
            user0._id,
            user.userProfile.avatar,
            "mention",
            user._id,
          ).SendPushNotification();
        });
      }
    } catch (e) {
      logger.error(e);
      throw new Error(e);
    }
  }

  /**
   *
   * @param parentPostID
   * @param limit - The limit of comments to fetch from the feed
   * @param userID
   * @param page
   * @constructor
   */

  public static async GetComments(
    parentPostID: string,
    userID: string,
    limit: number,
    page: number
  ) {
    try {
      const aggregate = [
        {
          $match: { parentPost: Types.ObjectId(parentPostID) },
        },
        {
          $addFields: {
            isLiked: { $in: [Types.ObjectId(userID), "$likedBy"] },
          },
        },
        {
          $project: {
            likedBy: 0,
          },
        },
        {
          $lookup: {
            from: "users",
            let: { authorID: "$author" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$authorID"] } } },
              { $project: { password: 0, email: 0 } },
            ],
            as: "author",
          },
        },
        {
          $lookup: {
            from: "comments",
            let: { commentID: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$parentPost", "$$commentID"] } } },
              {
                $addFields: {
                  isLiked: { $in: [Types.ObjectId(userID), "$likedBy"] },
                },
              },
              {
                $project: {
                  likedBy: 0,
                },
              },
              {
                $lookup: {
                  from: "users",
                  let: { authorID: "$author" },
                  pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$authorID"] } } },
                    { $project: { password: 0, email: 0 } },
                  ],
                  as: "author",
                },
              },
              {
                $sort: {
                  likes: -1,
                  comments: -1,
                  createdAt: -1,
                },
              },
              {
                $limit: 4,
              },
            ],
            as: "replies",
          },
        },
        {
          $sort: {
            likes: -1,
            comments: -1,
            createdAt: -1,
          },
        },
      ];

      const options = {
        page,
        limit,
      };

      const agg = CommentModel.aggregate(aggregate);
      // @ts-ignore
      const comments = await CommentModel.aggregatePaginate(agg, options);
      return { comments: comments.docs };
    } catch (e) {
      logger.error(e);
      throw new Error(e);
    }
  }

  public static async CheckFeedStatus(
    userID: string,
    primaryCache: IORedis.Redis
  ) {
    if ((await primaryCache.sismember("dirty", userID)) === 1) {
      return { newsfeedStatus: "dirty" };
    } else {
      return { newsfeedStatus: "sanitized" };
    }
  }

  /**
   * Retrives posts from cache`
   *
   * @param keys Keys of the post
   * @param userID
   */
  private static async Hydrate(keys: Types.ObjectId[], userID: string) {
    try {
      return await AggregationQueries.NewsfeedPostAggreg(userID, keys);
    } catch (e) {
      logger.error(e);
    }
  }

  public static async AddToFeed(
    userID: string,
    targetID: string,
    primaryCache: IORedis.Redis
  ) {
    try {
      const RecentPosts = await PostModel.find(
        {
          author: targetID,
          createdAt: { $gte: new Date().getTime() - 48 * 60 * 60 * 1000 },
        },
        { _id: 1 }
      )
        .lean()
        .exec();
      const pipeline = primaryCache.pipeline();

      const ttl_time = process.env.POST_EXPIRE;
      const ttl_unit = process.env.POST_EXPIRE_UNIT as any;
      const ttl = moment().utc().add(ttl_time, ttl_unit).valueOf();

      RecentPosts.forEach((post: any) => {
        pipeline.zadd(userID, ttl.toString(), post._id);
      });
      pipeline.exec();
    } catch (error) {
      logger.error(error);
    }
  }
}
