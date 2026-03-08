export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const supabase = await createClient();
  const { postId } = await params;

  try {
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select(`
        id,
        user_id,
        content,
        like_count,
        created_at,
        user_profiles!post_comments_user_id_fkey (
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: comments || [] });
  } catch (error) {
    console.error('Error in GET /api/community/posts/[postId]/comments:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    // Ensure user has a profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!existingProfile) {
      await supabase.from('user_profiles').insert({
        user_id: user.id,
        display_name: user.email?.split('@')[0] || 'User',
        username: user.id.slice(0, 8),
      });
    }

    // Create the comment
    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
      })
      .select(`
        id,
        user_id,
        content,
        like_count,
        created_at,
        user_profiles!post_comments_user_id_fkey (
          display_name,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Create notification for post owner
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (post && post.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: post.user_id,
        actor_id: user.id,
        type: 'comment',
        reference_id: postId,
        content: '회원님의 게시글에 댓글을 남겼습니다.',
      });
    }

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    console.error('Error in POST /api/community/posts/[postId]/comments:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
