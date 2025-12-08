'use client';

import { useState, useEffect, useRef } from 'react';
import { VotesPosts } from '@/types/news';
import { useAuth } from '@/context/AuthContext';

interface VoteCardProps {
    vote: VotesPosts;
}

// Глобальные ссылки на аудио для всего приложения
let globalWaitingMusic: HTMLAudioElement | null = null;
let globalVotedMusic: HTMLAudioElement | null = null;
let currentPlayingMusic: 'waiting' | 'voted' | null = null;
let musicInitialized = false;

export default function VoteCard({ vote }: VoteCardProps) {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentVote, setCurrentVote] = useState(vote);
    const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
    const [musicState, setMusicState] = useState<'idle' | 'waiting' | 'voted'>('idle');
    const [isLoading, setIsLoading] = useState(true); // Новое состояние загрузки

    // Проверяем через API, голосовал ли пользователь
    useEffect(() => {
        const checkUserVote = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/votes/${vote.id}/user-vote?username=${user.username}`);
                const result = await response.json();

                if (result.success) {
                    if (result.data.hasVoted) {
                        setUserVote(result.data.voteType);
                    }
                }
            } catch (error) {
                console.error('Error checking user vote:', error);
            } finally {
                setIsLoading(false); // Загрузка завершена в любом случае
            }
        };

        checkUserVote();
    }, [user, vote.id]);

    // Инициализация глобального аудио
    useEffect(() => {
        if (!musicInitialized) {
            globalWaitingMusic = new Audio('/music/golosovanie.mp3');
            globalWaitingMusic.volume = 0.3;
            globalWaitingMusic.loop = true;
            globalWaitingMusic.muted = true;
            globalWaitingMusic.preload = 'auto';

            globalVotedMusic = new Audio('/music/golosovanie-zaversheno.mp3');
            globalVotedMusic.volume = 0.4;
            globalVotedMusic.loop = false;
            globalVotedMusic.preload = 'auto';

            globalWaitingMusic.load();
            globalVotedMusic.load();

            musicInitialized = true;
        }

        return () => {
            stopAllMusic();
        };
    }, []);

    // Останавливаем всю музыку
    const stopAllMusic = () => {
        if (globalWaitingMusic) {
            globalWaitingMusic.pause();
            globalWaitingMusic.currentTime = 0;
        }
        if (globalVotedMusic) {
            globalVotedMusic.pause();
            globalVotedMusic.currentTime = 0;
        }
        currentPlayingMusic = null;
        setMusicState('idle');
    };

    // Воспроизводим музыку ожидания с обходом автоплея
    const playWaitingMusic = async () => {
        if (currentPlayingMusic === 'waiting') return;

        stopAllMusic();

        if (globalWaitingMusic) {
            try {
                globalWaitingMusic.muted = true;
                globalWaitingMusic.currentTime = 0;
                await globalWaitingMusic.play();
                globalWaitingMusic.muted = false;

                currentPlayingMusic = 'waiting';
                setMusicState('waiting');
                console.log('🎵 Started waiting music automatically');
            } catch (error) {
                console.log('❌ Autoplay blocked, trying fallback...');
                try {
                    globalWaitingMusic.muted = false;
                    await globalWaitingMusic.play();
                    currentPlayingMusic = 'waiting';
                    setMusicState('waiting');
                    console.log('🎵 Started waiting music with fallback');
                } catch (fallbackError) {
                    console.log('❌ All autoplay attempts failed');
                }
            }
        }
    };

    // Воспроизводим музыку голосования
    const playVotedMusic = async () => {
        if (currentPlayingMusic === 'voted') return;

        stopAllMusic();

        if (globalVotedMusic) {
            try {
                globalVotedMusic.muted = true;
                globalVotedMusic.currentTime = 0;
                await globalVotedMusic.play();
                globalVotedMusic.muted = false;

                currentPlayingMusic = 'voted';
                setMusicState('voted');
                console.log('🎵 Started voted music automatically');
            } catch (error) {
                console.log('❌ Autoplay blocked, trying fallback...');
                try {
                    globalVotedMusic.muted = false;
                    await globalVotedMusic.play();
                    currentPlayingMusic = 'voted';
                    setMusicState('voted');
                    console.log('🎵 Started voted music with fallback');
                } catch (fallbackError) {
                    console.log('❌ All autoplay attempts failed');
                }
            }
        }
    };

    // Основная логика управления музыкой - запускается только после загрузки данных
    useEffect(() => {
        // Не запускаем музыку пока данные не загружены
        if (isLoading) return;

        const isActive = new Date() <= new Date(vote.dateto);

        if (!isActive) {
            stopAllMusic();
            return;
        }

        if (!user) {
            stopAllMusic();
            return;
        }

        if (!userVote) {
            // Пользователь уже проголосовал
            playWaitingMusic();
        } else {
            // Пользователь еще не проголосовал - включаем музыку ожидания
            // только после того как убедились что он не голосовал
            playVotedMusic();
        }
    }, [userVote, user, vote.dateto, isLoading]); // Добавили isLoading в зависимости

    // Дополнительная попытка запуска музыки после загрузки данных
    useEffect(() => {
        if (isLoading) return;

        const timer = setTimeout(() => {
            const isActive = new Date() <= new Date(vote.dateto);
            if (isActive && user && !userVote && musicState !== 'waiting') {
                playWaitingMusic();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [isLoading, user, userVote, vote.dateto]);

    const closeVotePost = async () => {
        try {
            const response = await fetch(`/api/votes/${vote.id}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (!result.success) {
                alert(result.error || 'Ошибка при закрытии голосования');
            }
        } catch (error) {
            console.error('Error closing vote:', error);
        }
    }

    const isActive = new Date() <= new Date(vote.dateto);

    // Автоматическое закрытие голосования
    useEffect(() => {
        if (!isActive && vote.status === 'open') {
            closeVotePost();
        }
    }, [isActive, vote.status]);

    const handleVote = async (voteType: 'yes' | 'no') => {
        if (!user || isSubmitting || !isActive || userVote) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/votes/${vote.id}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: user.username,
                    vote: voteType
                })
            });

            const result = await response.json();

            if (result.success) {
                setCurrentVote(result.data.vote);
                setUserVote(voteType);
            } else {
                alert(result.error || 'Ошибка при голосовании');
            }
        } catch (error) {
            console.error('Error voting:', error);
            alert('Ошибка при голосовании');
        } finally {
            setIsSubmitting(false);
        }
    };

    const votesYes = Number(currentVote.voteyes) || 0;
    const votesNo = Number(currentVote.voteno) || 0;
    const totalVotes = votesYes + votesNo;

    const forPercent = totalVotes > 0 ? Math.round((votesYes / totalVotes) * 100) : 0;
    const againstPercent = totalVotes > 0 ? Math.round((votesNo / totalVotes) * 100) : 0;

    return (
        <div className="bg-cgray-2 border border-cgray-2 rounded-lg p-4 lg:p-6 mb-4 shadow-xl bg-filter mt-5">
            {/* Скрытые аудио элементы для глобального управления */}
            <audio
                id="global-waiting-music"
                className="hidden"
                preload="auto"
            >
                <source src="/music/golosovanie.mp3" type="audio/mpeg" />
            </audio>

            <audio
                id="global-voted-music"
                className="hidden"
                preload="auto"
            >
                <source src="/music/golosovanie-zaversheno.mp3" type="audio/mpeg" />
            </audio>

            <h3 className="text-lg lg:text-xl font-semibold mb-3 text-cwhite-1">
                {vote.title}
            </h3>

            <div className="mb-4">
                <div className="flex justify-between text-sm text-cwhite-1/80 mb-2">
                    <span>Начало: {new Date(vote.datefrom).toLocaleDateString('ru-RU')}</span>
                    <span>Окончание: {new Date(vote.dateto).toLocaleDateString('ru-RU')}</span>
                </div>

                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    isActive
                        ? 'bg-green-1/20 text-green-1 border border-green-1'
                        : 'bg-red-1/20 text-red-1 border border-red-1'
                }`}>
                    {isActive ? 'Активно' : 'Завершено'}
                </div>
            </div>

            {/* Результаты голосования */}
            {totalVotes > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-cwhite-1 mb-1">
                        <span>За: {forPercent}% ({votesYes})</span>
                        <span>Против: {againstPercent}% ({votesNo})</span>
                    </div>
                    <div className="w-full bg-cgray-1 rounded-full h-2">
                        <div
                            className="bg-green-1 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${forPercent}%` }}
                        ></div>
                    </div>
                    <div className="text-xs text-cwhite-1/60 mt-1 text-center">
                        Всего голосов: {totalVotes}
                    </div>
                </div>
            )}
            {isLoading && (
                <div className="text-center py-2">
                    <span className="text-cwhite-1 text-sm">
                        Загрузка голосов...
                    </span>
                </div>
            )}
            {/* Кнопки голосования */}
            {isActive && user && !userVote && !isLoading && (
                <div className="flex gap-3">
                    <button
                        onClick={() => handleVote('yes')}
                        disabled={isSubmitting}
                        className="flex-1 bg-green-1 hover:bg-green-1/70 hover:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-all text-sm lg:text-base"
                    >
                        {isSubmitting ? '...' : 'За'}
                    </button>
                    <button
                        onClick={() => handleVote('no')}
                        disabled={isSubmitting}
                        className="flex-1 bg-red-1 hover:bg-red-1/70 hover:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-all text-sm lg:text-base"
                    >
                        {isSubmitting ? '...' : 'Против'}
                    </button>
                </div>
            )}

            {userVote && (
                <div className="text-center py-2">
                    <span className="text-green-1 text-sm">
                        Вы проголосовали: {userVote === 'yes' ? 'ЗА' : 'ПРОТИВ'}
                    </span>
                </div>
            )}

            {!user && isActive && (
                <div className="text-center py-2">
                    <span className="text-cwhite-1/60 text-sm">
                        Войдите, чтобы проголосовать
                    </span>
                </div>
            )}

        </div>
    );
}