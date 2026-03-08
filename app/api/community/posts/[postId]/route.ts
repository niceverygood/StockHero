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
    // Fetch the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        post_type,
        shared_stock_code,
        shared_stock_name,
        image_urls,
        like_count,
        comment_count,
        created_at,
        user_profiles!posts_user_id_fkey (
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('id', postId)
      .single();

    if (postError) {
      console.error('Error fetching post:', postError);
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Fetch comments
    const { data: comments, error: commentsError } = await supabase
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

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
    }

    // Check if user has liked the post
    const { data: { user } } = await supabase.auth.getUser();
    let isLiked = false;

    if (user) {
      const { data: like } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      isLiked = !!like;
    }

    return NextResponse.json({
      success: true,
      data: {
        post: { ...post, isLiked },
        comments: comments || [],
      },
    });
  } catch (error) {
    console.error('Error in GET /api/community/posts/[postId]:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Check if user owns the post
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (!post || post.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Delete the post
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/community/posts/[postId]:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
