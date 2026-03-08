export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const supabase = await createClient();
  const { postId } = await params;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike
      await supabase
        .from('post_likes')
        .delete()
        .eq('id', existingLike.id);

      // Get updated like count
      const { data: post } = await supabase
        .from('posts')
        .select('like_count')
        .eq('id', postId)
        .single();

      return NextResponse.json({
        success: true,
        data: { isLiked: false, likeCount: post?.like_count || 0 },
      });
    } else {
      // Like
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });

      // Get updated like count
      const { data: post } = await supabase
        .from('posts')
        .select('like_count, user_id')
        .eq('id', postId)
        .single();

      // Create notification for post owner (if not self)
      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: user.id,
          type: 'like',
          reference_id: postId,
          content: '회원님의 게시글에 좋아요를 눌렀습니다.',
        });
      }

      return NextResponse.json({
        success: true,
        data: { isLiked: true, likeCount: post?.like_count || 0 },
      });
    }
  } catch (error) {
    console.error('Error in POST /api/community/posts/[postId]/like:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
