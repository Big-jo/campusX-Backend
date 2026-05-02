import mongoose from 'mongoose';

/**
 * Common aggregation pipelines for posts
 */
export class AggregationPipelines {
  /**
   * Standard author lookup with projection
   */
  static authorLookup() {
    return {
      $lookup: {
        from: 'users',
        let: { authorID: '$author' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$authorID'] } } },
          {
            $project: {
              // firstName: 1,
              // lastName: 1,
              name: 1,
              userTag: 1,
              'userProfile.avatar': 1,
              'userProfile.university': 1
            }
          }
        ],
        as: 'author'
      }
    };
  }

  /**
   * Add isLiked/isDisliked fields
   */
  static addLikeFields(userId: string | null) {
    const userObjId = userId ? mongoose.Types.ObjectId(userId) : null;
    return {
      $addFields: {
        isLiked: userObjId ? { $in: [userObjId, '$likedBy'] } : false,
        isDisliked: userObjId ? { $in: [userObjId, '$dislikedBy'] } : false
      }
    };
  }

  /**
   * Project out sensitive fields
   */
  static projectSensitiveFields() {
    return {
      $project: {
        likedBy: 0,
        dislikedBy: 0
      }
    };
  }

  /**
   * Top comments lookup with score-based sorting
   */
  static topCommentsLookup(userId: string, limit: number = 4) {
    return {
      $lookup: {
        from: 'posts',
        let: {
          parentPost: { $toString: '$_id' }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$parentPost', '$$parentPost'] },
                  { $eq: ['$type', 'comment'] }
                ]
              }
            }
          },
          {
            $addFields: {
              score: { $add: [{ $multiply: [2, '$likes'] }, { $multiply: [4.7, '$comments'] }] }
            }
          },
          { $sort: { score: -1 } },
          { $limit: limit },
          this.addLikeFields(userId),
          this.projectSensitiveFields(),
          this.authorLookup(),
          { $unwind: '$author' }
        ],
        as: 'top_comments'
      }
    };
  }

  /**
   * Lookup scraped content details for bot posts (only when contentId present)
   */
  static scrapedContentLookup() {
    return {
      $lookup: {
        from: 'scrapedcontents',
        let: { cid: '$contentId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$cid'] } } },
          {
            $project: {
              title: 1,
              url: 1,
              sourceDomain: 1,
              interestCategory: 1,
              images: 1,
              keywords: 1,
              'enriched.summary': 1,
              'enriched.caption': 1,
              'enriched.insights': 1,
              'enriched.conversation_starter': 1,
              'enriched.hashtags': 1,
              'metadata.author': 1,
              'metadata.publishedAt': 1,
              'metadata.wordCount': 1,
              qualityScore: 1,
              scrapedAt: 1,
            }
          }
        ],
        as: 'scrapedContent'
      }
    };
  }

  /**
   * Flatten scrapedContent array to single object (null when absent)
   */
  static addScrapedContentField() {
    return {
      $addFields: {
        scrapedContent: { $ifNull: [{ $arrayElemAt: ['$scrapedContent', 0] }, null] }
      }
    };
  }

  /**
   * Complete post pipeline with author and like fields
   */
  static postPipeline(userId: string | null, options: { includeTopComments?: boolean; topCommentsLimit?: number } = {}) {
    const pipeline: any[] = [
      this.addLikeFields(userId),
      this.projectSensitiveFields(),
      this.authorLookup(),
      { $unwind: '$author' },
      this.scrapedContentLookup(),
      this.addScrapedContentField(),
    ];

    if (options.includeTopComments && userId) {
      pipeline.push(this.topCommentsLookup(userId, options.topCommentsLimit));
    }

    return pipeline;
  }
}
