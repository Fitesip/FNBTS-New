export interface ForumPost {
    id: number;
    author: string;
    title: string;
    text: string;
    date: string;
    time: string;
    likes: number;
    likeAuthors: string;
    dislikes: number;
    dislikeAuthors: string;
    status: string;
}

export interface CreatePostRequest {
    author: string;
    title: string;
    text: string;
    date?: string;
    time?: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface LikeState {
    likes: number;
    dislikes: number;
    likeAuthors: string[];
    dislikeAuthors: string[];
    userLiked: boolean;
    userDisliked: boolean;
}

export interface ForumComment {
    id: number;
    author: string;
    text: string;
    postID: number;
    count: number;
    date: string;
    time: string;
    answerTo: number | null;
    answerToUser: string | null;
}

export interface CreateCommentRequest {
    author: string;
    text: string;
    postID: number;
    answerTo?: number | null;
}