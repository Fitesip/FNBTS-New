import { useState, useEffect } from 'react';
import { VotesPosts } from '@/types/news';

interface UseVotesResult {
    votes: VotesPosts[];
    loading: boolean;
    error: string | null;
    totalPages: number;
    refreshVotes: () => void;
}

export function useVotes(page: number = 1, limit: number = 10): UseVotesResult {
    const [votes, setVotes] = useState<VotesPosts[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(1);

    const fetchVotes = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/votes?page=${page}&limit=${limit}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Ошибка при загрузке голосований');
            }
            console.log(result);
            setVotes(result.data.votesposts || []);
            setTotalPages(Math.ceil((result.data.total || 0) / limit));
        } catch (err) {
            console.error('Error fetching votes:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при загрузке голосований');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVotes();
    }, [page, limit]);

    const refreshVotes = () => {
        fetchVotes();
    };

    return {
        votes,
        loading,
        error,
        totalPages,
        refreshVotes
    };
}