// src/types/news.ts
export interface News {
    id: number;
    author: string;
    title: string;
    text: string;
    date: string;
    time: string;
    tag: string;
    likes: number;
    likeAuthors: string;
    dislikes: number;
    dislikeAuthors: string;
}

export interface CreateNewsRequest {
    author: string;
    title: string;
    text: string;
    date?: string;
    time?: string;
    tag: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface VotesPosts {
    id: number;
    title: string;
    datefrom: string;
    dateto: string;
    voteyes: number;
    voteno: number;
    status: 'open' | 'close';
}

export interface UserVote {
    id: number;
    username: string;
    vote_id: number;
    vote_type: 'yes' | 'no';
    voted_at: string;
}