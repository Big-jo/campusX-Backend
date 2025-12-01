export class AuthorDTO {
  _id: string;
  name: string;
  userTag: string;
  userProfile: {
    avatar?: string;
    university?: string;
  };

  constructor(data: any) {
    const author = Array.isArray(data) ? data[0] : data;
    this._id = author._id?.toString();
    this.name = author.name;
    this.userTag = author.userTag;
    this.userProfile = {
      avatar: author.userProfile?.avatar,
      university: author.userProfile?.university
    };
  }
}

/**
 * Base DTO with common post properties
 */
export abstract class BasePostDTO {
  _id: string;
  type: 'post' | 'comment' | 'circlePost';
  text?: string;
  images?: string[];
  videos?: string[];
  image?: string; // Legacy
  video?: string; // Legacy
  author: AuthorDTO;
  likes: number;
  dislikes: number;
  comments: number;
  isLiked: boolean;
  isDisliked: boolean;
  createdAt: number;
  hashTags?: string[];
  mentions?: string[];

  constructor(data: any) {
    this._id = data._id?.toString();
    this.type = data.type;
    this.text = data.text;
    this.images = data.images;
    this.videos = data.videos;
    this.image = data.image;
    this.video = data.video;
    this.author = new AuthorDTO(data.author);
    this.likes = data.likes || 0;
    this.dislikes = data.dislikes || 0;
    this.comments = data.comments || 0;
    this.isLiked = data.isLiked || false;
    this.isDisliked = data.isDisliked || false;
    this.createdAt = data.createdAt;
    this.hashTags = data.hashTags;
    this.mentions = data.mentions;
  }
}

/**
 * Comment DTO
 */
export class CommentDTO extends BasePostDTO {
  type: 'comment';
  parentPost: string;

  constructor(data: any) {
    super(data);
    this.type = 'comment';
    this.parentPost = data.parentPost;
  }
}

/**
 * Post DTO with optional top_comments
 */
export class PostDTO extends BasePostDTO {
  type: 'post';
  campus?: string;
  trash: number;
  top_comments?: CommentDTO[];

  constructor(data: any) {
    super(data);
    this.type = 'post';
    this.campus = data.campus;
    this.trash = data.trash || 0;
    this.top_comments = data.top_comments?.map((c: any) => new CommentDTO(c));

    if (data.image && data.images?.length === 0) {
      this.images = [data.image];
    }
  }
}

/**
 * Circle Post DTO
 */
export class CirclePostDTO extends BasePostDTO {
  type: 'circlePost';
  circleID: string;
  campus?: string;
  trash: number;

  constructor(data: any) {
    super(data);
    this.type = 'circlePost';
    this.circleID = data.circleID?.toString();
    this.campus = data.campus;
    this.trash = data.trash || 0;
  }
}

/**
 * Factory to create appropriate DTO based on type
 */
export function createPostDTO(data: any): PostDTO | CommentDTO | CirclePostDTO {
  switch (data.type) {
    case 'comment':
      return new CommentDTO(data);
    case 'circlePost':
      return new CirclePostDTO(data);
    default:
      return new PostDTO(data);
  }
}
