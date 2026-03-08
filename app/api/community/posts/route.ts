export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get('stockCode');

  try {
    let query = supabase
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
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (stockCode) {
      query = query.eq('shared_stock_code', stockCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Check if user has liked each post
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && data) {
      const postIds = data.map(p => p.id);
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);

      const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
      
      const postsWithLikes = data.map(post => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      }));

      return NextResponse.json({ success: true, data: postsWithLikes });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /api/community/posts:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, stockCode, stockName, postType = 'text', imageUrls = [] } = body;

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

    // Create the post
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        post_type: postType,
        shared_stock_code: stockCode || null,
        shared_stock_name: stockName || null,
        image_urls: imageUrls,
      })
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
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Error in POST /api/community/posts:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
