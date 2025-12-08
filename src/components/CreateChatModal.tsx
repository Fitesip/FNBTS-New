// src/components/CreateChatModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import UserPhoto from './UserPhoto';
import { ChatUser } from '@/types/chat';

interface CreateChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChatCreated: (chatId: number) => void;
}

export default function CreateChatModal({ isOpen, onClose, onChatCreated }: CreateChatModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
    const [isGroup, setIsGroup] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    const { createChat, searchUsers } = useChat();
    const modalRef = useRef<HTMLDivElement>(null);

    // Поиск пользователей
    useEffect(() => {
        const search = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setSearchLoading(true);
            try {
                const users = await searchUsers(searchQuery);
                const filteredUsers = users.filter(user =>
                    !selectedUsers.some(selected => selected.id === user.id)
                );
                setSearchResults(filteredUsers);
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        };

        const timeoutId = setTimeout(search, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, searchUsers, selectedUsers]);

    // Закрытие по клику вне области
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Сброс состояния
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedUsers([]);
            setIsGroup(false);
            setGroupName('');
        }
    }, [isOpen]);

    const handleUserSelect = (user: ChatUser) => {
        if (!selectedUsers.some(selected => selected.id === user.id)) {
            setSelectedUsers(prev => [...prev, user]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleUserRemove = (userId: number) => {
        setSelectedUsers(prev => prev.filter(user => user.id !== userId));
    };

    const handleCreateChat = async () => {
        if (selectedUsers.length === 0) {
            alert('Выберите участников');
            return;
        }

        if (isGroup && !groupName.trim()) {
            alert('Введите название группы');
            return;
        }

        setLoading(true);
        try {
            const participantIds = selectedUsers.map(user => user.id);
            const newChat = await createChat(participantIds, isGroup, groupName.trim());

            if (newChat) {
                onChatCreated(newChat.id);
                onClose();
            } else {
                alert('Ошибка при создании чата');
            }
        } catch (error) {
            console.error('Create chat error:', error);
            alert('Ошибка при создании чата');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-50 flex items-center justify-center">
            <div ref={modalRef} className="p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 shadow-xl w-full max-w-md">
                <div className="bg-cgray-1 text-white p-4 rounded-t-lg">
                    <h2 className="text-lg font-semibold">Создать чат</h2>
                </div>

                <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={isGroup}
                            onChange={(e) => setIsGroup(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">Групповой чат</span>
                    </div>

                    {isGroup && (
                        <div>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Название группы"
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    )}

                    <div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск пользователей"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />

                        {searchLoading && (
                            <div className="text-center mt-2">Поиск...</div>
                        )}

                        {searchResults.length > 0 && (
                            <div className="mt-2 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 max-h-32 overflow-y-auto hover:bg-cgray-1 hover:scale-95 transition-all">
                                {searchResults.map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => handleUserSelect(user)}
                                        className="p-2 cursor-pointer flex items-center gap-3"
                                    >
                                        <UserPhoto username={user.username} withUsername={true} className={`size-16`} />
                                        <span>{user.username}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedUsers.length > 0 && (
                        <div>
                            <div className="text-sm font-medium mb-2">Участники:</div>
                            <div className="space-y-2">
                                {selectedUsers.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-4 text-cwhite-1 bg-cgray-1 border border-cgray-1 rounded-lg bg-filter z-10">
                                        <div className="flex items-center gap-3">
                                            <UserPhoto username={user.username} withUsername={true} className={`size-16`} />
                                            <span>{user.username}</span>
                                        </div>
                                        <button
                                            onClick={() => handleUserRemove(user.id)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleCreateChat}
                        disabled={loading || selectedUsers.length === 0}
                        className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Создание...' : 'Создать'}
                    </button>
                </div>
            </div>
        </div>
    );
}