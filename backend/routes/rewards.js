/**
 * Rewards System API Routes
 * Handles user rewards, points, coupons, and redemptions
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware to verify user authentication
const verifyAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Auth verification failed' });
  }
};

/**
 * GET /api/rewards/user-points
 * Get user's current points balance and reward status
 */
router.get('/user-points', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user rewards summary
    const { data: userRewards, error: rewardsError } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (rewardsError && rewardsError.code !== 'PGRST116') {
      throw rewardsError;
    }

    // If no rewards record exists, create one
    if (!userRewards) {
      const { data: newRewards, error: createError } = await supabase
        .from('user_rewards')
        .insert([{
          user_id: userId,
          total_points: 0,
          app_download_bonus_claimed: false
        }])
        .select()
        .single();

      if (createError) throw createError;

      return res.json(newRewards);
    }

    res.json(userRewards);
  } catch (err) {
    console.error('Error fetching user points:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rewards/claim-download-bonus
 * Claim one-time download/installation bonus
 */
router.post('/claim-download-bonus', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const DOWNLOAD_BONUS_POINTS = 500;

    // Get or create user rewards record
    let { data: userRewards, error: fetchError } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!userRewards) {
      const { data: created } = await supabase
        .from('user_rewards')
        .insert([{ user_id: userId }])
        .select()
        .single();
      userRewards = created;
    }

    // Check if already claimed
    if (userRewards.app_download_bonus_claimed) {
      return res.status(400).json({ 
        error: 'Download bonus already claimed',
        message: 'You have already claimed your download bonus'
      });
    }

    // Award points
    const newPoints = userRewards.total_points + DOWNLOAD_BONUS_POINTS;

    // Update user rewards
    const { data: updated, error: updateError } = await supabase
      .from('user_rewards')
      .update({
        total_points: newPoints,
        app_download_bonus_claimed: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log the points transaction
    await supabase
      .from('rewards_points_log')
      .insert([{
        user_id: userId,
        points: DOWNLOAD_BONUS_POINTS,
        points_type: 'app_download',
        description: 'Download/Installation Bonus',
        is_active: true
      }]);

    // Log transaction
    await supabase
      .from('rewards_transactions')
      .insert([{
        user_id: userId,
        transaction_type: 'earn',
        points_change: DOWNLOAD_BONUS_POINTS,
        points_before: userRewards.total_points,
        points_after: newPoints,
        description: 'App Download Bonus'
      }]);

    res.json({
      success: true,
      message: `Congratulations! You earned ${DOWNLOAD_BONUS_POINTS} points`,
      points_awarded: DOWNLOAD_BONUS_POINTS,
      total_points: newPoints
    });
  } catch (err) {
    console.error('Error claiming download bonus:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rewards/generate-coupon
 * Admin endpoint to generate coupon codes
 */
router.post('/generate-coupon', verifyAuth, async (req, res) => {
  try {
    // Verify admin role
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.user.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      discount_percentage,
      discount_amount,
      max_uses = 1,
      minimum_amount = 0,
      points_cost,
      expires_at
    } = req.body;

    if (!discount_percentage && !discount_amount) {
      return res.status(400).json({ 
        error: 'Either discount_percentage or discount_amount is required' 
      });
    }

    if (!points_cost) {
      return res.status(400).json({ error: 'points_cost is required' });
    }

    // Generate unique coupon code
    const coupon_code = 'CPM' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

    const { data: coupon, error: insertError } = await supabase
      .from('rewards_coupons')
      .insert([{
        coupon_code,
        discount_percentage: discount_percentage || null,
        discount_amount: discount_amount || null,
        max_uses,
        minimum_amount,
        points_cost,
        created_by: req.user.id,
        expires_at,
        status: 'active'
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({
      success: true,
      coupon
    });
  } catch (err) {
    console.error('Error generating coupon:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/rewards/available-coupons
 * Get available coupons for the user
 */
router.get('/available-coupons', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: coupons, error } = await supabase
      .from('rewards_coupons')
      .select('*')
      .eq('status', 'active')
      .filter('current_uses', 'lt', 'max_uses')
      .filter('expires_at', 'gte', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ coupons });
  } catch (err) {
    console.error('Error fetching available coupons:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rewards/redeem-coupon
 * Redeem a coupon code for discount
 */
router.post('/redeem-coupon', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { coupon_code, amount } = req.body;

    if (!coupon_code || !amount) {
      return res.status(400).json({ error: 'coupon_code and amount are required' });
    }

    // Fetch coupon
    const { data: coupon, error: fetchError } = await supabase
      .from('rewards_coupons')
      .select('*')
      .eq('coupon_code', coupon_code)
      .single();

    if (fetchError || !coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Validate coupon
    if (coupon.status !== 'active') {
      return res.status(400).json({ error: 'Coupon is no longer active' });
    }

    if (coupon.current_uses >= coupon.max_uses) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    if (amount < coupon.minimum_amount) {
      return res.status(400).json({ 
        error: `Minimum amount of ${coupon.minimum_amount} required for this coupon`
      });
    }

    // Get user points
    const { data: userRewards } = await supabase
      .from('user_rewards')
      .select('total_points')
      .eq('user_id', userId)
      .single();

    if (!userRewards || userRewards.total_points < coupon.points_cost) {
      return res.status(400).json({ 
        error: `Insufficient points. You need ${coupon.points_cost} points but have ${userRewards?.total_points || 0}`
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_percentage) {
      discountAmount = (amount * coupon.discount_percentage) / 100;
    } else if (coupon.discount_amount) {
      discountAmount = coupon.discount_amount;
    }

    // Update coupon usage
    const { error: updateCouponError } = await supabase
      .from('rewards_coupons')
      .update({
        current_uses: coupon.current_uses + 1,
        used_at: new Date().toISOString(),
        status: coupon.current_uses + 1 >= coupon.max_uses ? 'used' : 'active'
      })
      .eq('id', coupon.id);

    if (updateCouponError) throw updateCouponError;

    // Deduct points from user
    const newPoints = userRewards.total_points - coupon.points_cost;
    await supabase
      .from('user_rewards')
      .update({
        total_points: newPoints,
        total_coupons_claimed: (userRewards.total_coupons_claimed || 0) + 1
      })
      .eq('user_id', userId);

    // Log redemption
    await supabase
      .from('rewards_redemptions')
      .insert([{
        user_id: userId,
        coupon_id: coupon.id,
        points_used: coupon.points_cost,
        discount_received: discountAmount
      }]);

    // Log transaction
    await supabase
      .from('rewards_transactions')
      .insert([{
        user_id: userId,
        transaction_type: 'redeem',
        points_change: -coupon.points_cost,
        points_before: userRewards.total_points,
        points_after: newPoints,
        description: `Coupon Redemption: ${coupon_code}`,
        related_coupon_id: coupon.id
      }]);

    res.json({
      success: true,
      message: 'Coupon redeemed successfully',
      discount_amount: discountAmount,
      points_used: coupon.points_cost,
      remaining_points: newPoints
    });
  } catch (err) {
    console.error('Error redeeming coupon:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/rewards/redemption-history
 * Get user's redemption history
 */
router.get('/redemption-history', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const { data: history, error } = await supabase
      .from('rewards_redemptions')
      .select('*, rewards_coupons(coupon_code, discount_percentage, discount_amount)')
      .eq('user_id', userId)
      .order('redemption_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ history });
  } catch (err) {
    console.error('Error fetching redemption history:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/rewards/points-history
 * Get user's points earning history
 */
router.get('/points-history', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const { data: history, error } = await supabase
      .from('rewards_points_log')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ history });
  } catch (err) {
    console.error('Error fetching points history:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/rewards/user-tier
 * Get user's current reward tier
 */
router.get('/user-tier', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: tierData, error } = await supabase
      .from('user_reward_tier')
      .select('*, rewards_tiers(*)')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ tier: tierData || null });
  } catch (err) {
    console.error('Error fetching user tier:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/rewards/tiers
 * Get all available reward tiers
 */
router.get('/tiers', async (req, res) => {
  try {
    const { data: tiers, error } = await supabase
      .from('rewards_tiers')
      .select('*')
      .order('min_points', { ascending: true });

    if (error) throw error;

    res.json({ tiers });
  } catch (err) {
    console.error('Error fetching tiers:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/rewards/achievements
 * Get user's earned achievements
 */
router.get('/achievements', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: achievements, error } = await supabase
      .from('rewards_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;

    res.json({ achievements });
  } catch (err) {
    console.error('Error fetching achievements:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rewards/referral/generate
 * Generate referral code for user
 */
router.post('/referral/generate', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has a referral code
    const { data: existingRewards } = await supabase
      .from('user_rewards')
      .select('referral_code')
      .eq('user_id', userId)
      .single();

    if (existingRewards?.referral_code) {
      return res.json({ 
        referral_code: existingRewards.referral_code 
      });
    }

    // Generate unique referral code
    const referral_code = 'REF' + Date.now() + Math.random().toString(36).substr(2, 8).toUpperCase();

    // Update user rewards with referral code
    const { data: updated, error } = await supabase
      .from('user_rewards')
      .update({ referral_code })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      referral_code: updated.referral_code,
      message: 'Share this code to earn referral rewards'
    });
  } catch (err) {
    console.error('Error generating referral code:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rewards/referral/claim
 * Claim referral reward when new user signs up with referral code
 */
router.post('/referral/claim', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { referral_code } = req.body;

    if (!referral_code) {
      return res.status(400).json({ error: 'referral_code is required' });
    }

    // Find the referrer
    const { data: referrerRewards, error: fetchError } = await supabase
      .from('user_rewards')
      .select('user_id')
      .eq('referral_code', referral_code)
      .single();

    if (fetchError || !referrerRewards) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Check if referral already claimed
    const { data: existingReferral } = await supabase
      .from('rewards_referrals')
      .select('id')
      .eq('referred_user_id', userId)
      .single();

    if (existingReferral) {
      return res.status(400).json({ error: 'You have already used a referral code' });
    }

    const referrer_id = referrerRewards.user_id;
    const REFERRER_POINTS = 500;
    const REFEREE_POINTS = 200;

    // Create referral record
    const { data: referral, error: createError } = await supabase
      .from('rewards_referrals')
      .insert([{
        referrer_id,
        referred_user_id: userId,
        referral_code,
        status: 'completed'
      }])
      .select()
      .single();

    if (createError) throw createError;

    // Award referrer points
    const { data: referrerData } = await supabase
      .from('user_rewards')
      .select('total_points')
      .eq('user_id', referrer_id)
      .single();

    const referrerNewPoints = (referrerData?.total_points || 0) + REFERRER_POINTS;
    await supabase
      .from('user_rewards')
      .update({
        total_points: referrerNewPoints,
        referrer_reward_claimed: true
      })
      .eq('user_id', referrer_id);

    // Award referee points
    const { data: refereeData } = await supabase
      .from('user_rewards')
      .select('total_points')
      .eq('user_id', userId)
      .single();

    const refereeNewPoints = (refereeData?.total_points || 0) + REFEREE_POINTS;
    await supabase
      .from('user_rewards')
      .update({
        total_points: refereeNewPoints
      })
      .eq('user_id', userId);

    // Log points for both users
    await Promise.all([
      supabase
        .from('rewards_points_log')
        .insert({
          user_id: referrer_id,
          points: REFERRER_POINTS,
          points_type: 'referral',
          description: `Referral reward for user ${userId.substr(0, 8)}`
        }),
      supabase
        .from('rewards_points_log')
        .insert({
          user_id: userId,
          points: REFEREE_POINTS,
          points_type: 'referral',
          description: `Referral bonus from code: ${referral_code}`
        })
    ]);

    res.json({
      success: true,
      message: `Welcome! You earned ${REFEREE_POINTS} points`,
      referee_points: REFEREE_POINTS,
      referrer_notified: true
    });
  } catch (err) {
    console.error('Error claiming referral reward:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
