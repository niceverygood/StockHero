export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, supabaseAdmin } from '@/lib/supabase/server';

// GET - Get user profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!profile) {
      // Profile doesn't exist yet - return a basic profile if it's the current user
      if (user && user.id === userId) {
        // Auto-create profile for current user
        const newProfile = {
          user_id: userId,
          username: user.email?.split('@')[0] || `user_${userId.slice(0, 8)}`,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url || null,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error('Failed to create profile:', createError);
        }

        return NextResponse.json({
          success: true,
          data: {
            userId,
            username: newProfile.username,
            displayName: newProfile.display_name,
            avatarUrl: newProfile.avatar_url,
            bio: null,
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            isVerified: false,
            isFollowing: false,
            isOwnProfile: true,
          },
        });
      }

      // Try to get user info using admin client
      try {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (authError || !authUser?.user) {
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            userId,
            username: authUser.user.email?.split('@')[0] || `user_${userId.slice(0, 8)}`,
            displayName: authUser.user.user_metadata?.full_name || 'User',
            avatarUrl: authUser.user.user_metadata?.avatar_url,
            bio: null,
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            isVerified: false,
            isFollowing: false,
            isOwnProfile: user?.id === userId,
          },
        });
      } catch {
        // If admin access fails, return a basic response
        return NextResponse.json({
          success: true,
          data: {
            userId,
            username: `user_${userId.slice(0, 8)}`,
            displayName: 'User',
            avatarUrl: null,
            bio: null,
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            isVerified: false,
            isFollowing: false,
            isOwnProfile: user?.id === userId,
          },
        });
      }
    }

    // Check if current user is following this profile
    let isFollowing = false;
    if (user && user.id !== userId) {
      const { data: follow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();
      isFollowing = !!follow;
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: profile.user_id,
        username: profile.username,
        displayName: profile.display_name,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        coverImageUrl: profile.cover_image_url,
        website: profile.website,
        twitterHandle: profile.twitter_handle,
        followerCount: profile.follower_count,
        followingCount: profile.following_count,
        postCount: profile.post_count,
        isVerified: profile.is_verified,
        createdAt: profile.created_at,
        isFollowing,
        isOwnProfile: user?.id === userId,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT - Update own profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot update other user profile' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, displayName, bio, website, twitterHandle } = body;

    // Check username uniqueness
    if (username) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', username)
        .neq('user_id', userId)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Username already taken' },
          { status: 400 }
        );
      }
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        username: username || user.email?.split('@')[0],
        display_name: displayName || user.user_metadata?.full_name,
        bio,
        website,
        twitter_handle: twitterHandle,
        avatar_url: user.user_metadata?.avatar_url,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
