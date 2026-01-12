'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified?: boolean;
}

interface WatchlistItem {
  symbol_code: string;
  symbol_name: string;
}

interface Post {
  id: string;
  content: string;
  postType: 'text' | 'portfolio_share' | 'watchlist_share' | 'analysis';
  sharedPortfolioId?: string;
  sharedWatchlistItems?: WatchlistItem[];
  sharedStockCode?: string;
  sharedStockName?: string;
  imageUrls?: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPinned: boolean;
  createdAt: string;
  author: Author | null;
  isLiked: boolean;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author | null;
  likeCount: number;
}

// 피드 작성기 컴포넌트
export function FeedComposer({ onPostCreated }: { onPostCreated?: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'text' | 'portfolio_share' | 'watchlist_share'>('text');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          postType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setContent('');
        setPostType('text');
        setShowOptions(false);
        onPostCreated?.();
      }
    } catch (error) {
      console.error('Post creation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="card p-4 text-center">
        <p className="text-dark-400 text-sm">피드를 작성하려면 로그인이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex gap-3">
        {user.user_metadata?.avatar_url ? (
          <Image
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata?.full_name || 'User'}
            width={40}
            height={40}
            className="rounded-full shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold shrink-0">
            {user.email?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="무슨 생각을 하고 계신가요? 투자 인사이트를 공유해보세요..."
            className="w-full bg-dark-800 rounded-xl p-3 text-dark-200 placeholder-dark-500 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[80px]"
            rows={3}
          />
        </div>
      </div>

      {/* Options */}
      {showOptions && (
        <div className="flex gap-2 pl-13">
          <button
            onClick={() => setPostType('portfolio_share')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              postType === 'portfolio_share'
                ? 'bg-brand-500 text-white'
                : 'bg-dark-800 text-dark-400 hover:text-dark-200'
            }`}
          >
            💼 포트폴리오 공유
          </button>
          <button
            onClick={() => setPostType('watchlist_share')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              postType === 'watchlist_share'
                ? 'bg-brand-500 text-white'
                : 'bg-dark-800 text-dark-400 hover:text-dark-200'
            }`}
          >
            ⭐ 관심종목 공유
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pl-13">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-800 transition-colors"
            title="공유 옵션"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-800 transition-colors" title="이미지 첨부">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '게시 중...' : '게시하기'}
        </button>
      </div>
    </div>
  );
}

// 포스트 카드 컴포넌트
export function PostCard({ post, onLike, onComment }: { 
  post: Post; 
  onLike?: (postId: string, isLiked: boolean) => void;
  onComment?: (postId: string) => void;
}) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const handleLike = async () => {
    if (!user) return;

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);

    try {
      await fetch(`/api/community/posts/${post.id}/like`, {
        method: newIsLiked ? 'POST' : 'DELETE',
      });
      onLike?.(post.id, newIsLiked);
    } catch (error) {
      // Revert on error
      setIsLiked(!newIsLiked);
      setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/community/posts/${post.id}/comments`);
      const data = await res.json();
      if (data.success) {
        setComments(data.data);
      }
    } catch (error) {
      console.error('Fetch comments error:', error);
    }
  };

  const handleShowComments = () => {
    setShowComments(!showComments);
    if (!showComments && comments.length === 0) {
      fetchComments();
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setComments(prev => [...prev, data.data]);
        setNewComment('');
        onComment?.(post.id);
      }
    } catch (error) {
      console.error('Submit comment error:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="card p-4 space-y-4">
      {/* Author */}
      <div className="flex items-center gap-3">
        <Link href={`/user/${post.author?.id}`}>
          {post.author?.avatarUrl ? (
            <Image
              src={post.author.avatarUrl}
              alt={post.author.displayName || 'User'}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold">
              {post.author?.displayName?.charAt(0) || 'U'}
            </div>
          )}
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/user/${post.author?.id}`} className="font-semibold text-dark-100 hover:text-brand-400 transition-colors">
              {post.author?.displayName || 'Unknown'}
            </Link>
            {post.author?.isVerified && (
              <svg className="w-4 h-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-dark-500">@{post.author?.username}</span>
          </div>
          <div className="text-xs text-dark-500">{formatDate(post.createdAt)}</div>
        </div>
        {post.isPinned && (
          <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">📌 고정</span>
        )}
      </div>

      {/* Content */}
      <div className="text-dark-200 whitespace-pre-wrap">{post.content}</div>

      {/* Shared Content */}
      {post.postType === 'watchlist_share' && post.sharedWatchlistItems && (
        <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700">
          <div className="text-xs text-dark-500 mb-2">⭐ 공유된 관심종목</div>
          <div className="flex flex-wrap gap-2">
            {post.sharedWatchlistItems.map((item, i) => (
              <Link
                key={i}
                href={`/battle/${item.symbol_code}`}
                className="px-3 py-1.5 rounded-lg bg-dark-700 text-sm text-dark-200 hover:bg-dark-600 transition-colors"
              >
                {item.symbol_name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {post.sharedStockCode && (
        <Link
          href={`/battle/${post.sharedStockCode}`}
          className="block p-3 rounded-xl bg-dark-800/50 border border-dark-700 hover:border-brand-500/50 transition-colors"
        >
          <div className="text-xs text-dark-500 mb-1">📊 종목 분석</div>
          <div className="font-semibold text-dark-200">{post.sharedStockName}</div>
          <div className="text-xs text-dark-500">{post.sharedStockCode}</div>
        </Link>
      )}

      {/* Engagement */}
      <div className="flex items-center gap-6 pt-2 border-t border-dark-800">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 text-sm transition-colors ${
            isLiked ? 'text-rose-400' : 'text-dark-500 hover:text-rose-400'
          }`}
        >
          <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{likeCount}</span>
        </button>
        <button
          onClick={handleShowComments}
          className="flex items-center gap-2 text-sm text-dark-500 hover:text-brand-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{post.commentCount}</span>
        </button>
        <button className="flex items-center gap-2 text-sm text-dark-500 hover:text-emerald-400 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>공유</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="pt-4 border-t border-dark-800 space-y-4">
          {/* Comment Input */}
          {user && (
            <div className="flex gap-3">
              {user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="User"
                  width={32}
                  height={32}
                  className="rounded-full shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm shrink-0">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  className="flex-1 bg-dark-800 rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-500 transition-colors disabled:opacity-50"
                >
                  {isSubmittingComment ? '...' : '게시'}
                </button>
              </div>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <Link href={`/user/${comment.author?.id}`}>
                  {comment.author?.avatarUrl ? (
                    <Image
                      src={comment.author.avatarUrl}
                      alt={comment.author.displayName || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-dark-400 text-sm">
                      {comment.author?.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <div className="bg-dark-800/50 rounded-xl px-3 py-2">
                    <Link href={`/user/${comment.author?.id}`} className="text-sm font-medium text-dark-200 hover:text-brand-400">
                      {comment.author?.displayName || 'Unknown'}
                    </Link>
                    <p className="text-sm text-dark-300">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-dark-500">
                    <span>{formatDate(comment.createdAt)}</span>
                    <button className="hover:text-dark-300">좋아요</button>
                    <button className="hover:text-dark-300">답글</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 피드 리스트 컴포넌트
export function FeedList({ feedType = 'all', userId }: { feedType?: 'all' | 'following' | 'user'; userId?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (pageNum: number, append = false) => {
    try {
      const params = new URLSearchParams({
        type: feedType,
        page: pageNum.toString(),
        limit: '20',
      });
      if (userId) params.set('userId', userId);

      const res = await fetch(`/api/community/posts?${params}`);
      const data = await res.json();

      if (data.success) {
        if (append) {
          setPosts(prev => [...prev, ...data.data]);
        } else {
          setPosts(data.data);
        }
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Fetch posts error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    fetchPosts(1, false);
  }, [feedType, userId]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const refreshFeed = () => {
    setPage(1);
    fetchPosts(1, false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-dark-700" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-dark-700 rounded" />
                <div className="h-3 w-20 bg-dark-700 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-dark-700 rounded" />
              <div className="h-4 w-3/4 bg-dark-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">📝</div>
        <h3 className="text-lg font-semibold text-dark-300 mb-2">아직 게시물이 없습니다</h3>
        <p className="text-dark-500 text-sm">첫 번째 게시물을 작성해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FeedComposer onPostCreated={refreshFeed} />
      
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasMore && (
        <button
          onClick={loadMore}
          className="w-full py-3 text-center text-dark-400 hover:text-dark-200 transition-colors"
        >
          더 보기
        </button>
      )}
    </div>
  );
}

// 팔로우 버튼 컴포넌트
export function FollowButton({ userId, initialIsFollowing = false, onFollowChange }: {
  userId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleFollow = async () => {
    if (!user || user.id === userId) return;

    setIsLoading(true);
    const newIsFollowing = !isFollowing;
    setIsFollowing(newIsFollowing);

    try {
      if (newIsFollowing) {
        await fetch('/api/community/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
      } else {
        await fetch(`/api/community/follow?userId=${userId}`, {
          method: 'DELETE',
        });
      }
      onFollowChange?.(newIsFollowing);
    } catch (error) {
      setIsFollowing(!newIsFollowing);
      console.error('Follow error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.id === userId) return null;

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
        isFollowing
          ? 'bg-dark-800 text-dark-300 hover:bg-rose-500/20 hover:text-rose-400'
          : 'bg-brand-600 text-white hover:bg-brand-500'
      }`}
    >
      {isLoading ? '...' : isFollowing ? '팔로잉' : '팔로우'}
    </button>
  );
}








