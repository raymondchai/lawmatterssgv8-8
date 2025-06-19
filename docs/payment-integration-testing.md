# Payment Integration Testing Guide

This guide provides comprehensive testing procedures for the LawMattersSG payment integration system.

## Prerequisites

### 1. Stripe Configuration

Before testing, ensure you have the following Stripe configuration:

#### Environment Variables
Add these to your `.env.local` file:

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe test publishable key
STRIPE_SECRET_KEY=sk_test_...            # Your Stripe test secret key (for Edge Functions)
STRIPE_WEBHOOK_SECRET=whsec_...          # Webhook endpoint secret

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### Stripe Dashboard Setup
1. Create test products and prices in Stripe Dashboard
2. Update `STRIPE_PRICE_IDS` in `src/lib/config/constants.ts` with actual price IDs
3. Set up webhook endpoint pointing to your Supabase Edge Function

### 2. Database Migration

Ensure all subscription-related migrations are applied:

```bash
# Apply migrations
supabase db reset
# or
supabase migration up
```

### 3. Deploy Edge Functions

Deploy the payment-related Edge Functions:

```bash
supabase functions deploy create-subscription
supabase functions deploy stripe-webhook
supabase functions deploy get-subscription
supabase functions deploy cancel-subscription
supabase functions deploy reactivate-subscription
supabase functions deploy create-billing-portal
supabase functions deploy get-usage-info
```

## Testing Scenarios

### 1. Pricing Page Testing

#### Test Cases:
- [ ] Pricing page loads correctly at `/pricing`
- [ ] All subscription tiers are displayed with correct pricing
- [ ] Monthly/yearly toggle works correctly
- [ ] Feature comparison table shows accurate information
- [ ] FAQ section is displayed
- [ ] Call-to-action buttons work for each tier

#### Steps:
1. Navigate to `/pricing`
2. Verify all pricing information matches the configuration
3. Toggle between monthly and yearly billing
4. Click on subscription buttons for each tier
5. Verify redirects work correctly

### 2. Subscription Flow Testing

#### Test Cases:
- [ ] Free tier users can upgrade to Premium
- [ ] Free tier users can upgrade to Pro
- [ ] Premium users can upgrade to Pro
- [ ] Subscription page displays correct information
- [ ] Stripe Checkout session creates successfully
- [ ] Payment success page displays after successful payment
- [ ] Payment failure page displays after failed payment

#### Steps:
1. **Test Premium Subscription:**
   ```
   1. Go to /pricing
   2. Click "Subscribe Now" for Premium plan
   3. Verify redirect to /subscribe/premium
   4. Toggle monthly/yearly billing
   5. Click "Subscribe Now"
   6. Complete Stripe Checkout with test card: 4242 4242 4242 4242
   7. Verify redirect to payment success page
   8. Check database for updated subscription_tier
   ```

2. **Test Pro Subscription:**
   ```
   1. Go to /pricing
   2. Click "Subscribe Now" for Pro plan
   3. Verify redirect to /subscribe/pro
   4. Complete subscription flow
   5. Verify success
   ```

3. **Test Failed Payment:**
   ```
   1. Start subscription flow
   2. Use declined test card: 4000 0000 0000 0002
   3. Verify redirect to payment failure page
   4. Verify no subscription created in database
   ```

### 3. Subscription Management Testing

#### Test Cases:
- [ ] Subscription dashboard displays current plan
- [ ] Usage statistics are accurate
- [ ] Billing history is displayed
- [ ] Upgrade/downgrade options work
- [ ] Subscription cancellation works
- [ ] Subscription reactivation works
- [ ] Billing portal access works

#### Steps:
1. **Access Subscription Dashboard:**
   ```
   1. Login as subscribed user
   2. Navigate to /dashboard/subscription
   3. Verify current plan information
   4. Check usage statistics
   5. Verify billing information
   ```

2. **Test Plan Changes:**
   ```
   1. From Premium, upgrade to Pro
   2. Verify immediate plan change
   3. Check prorated billing
   4. Test downgrade (if implemented)
   ```

3. **Test Cancellation:**
   ```
   1. Click "Cancel Subscription"
   2. Verify cancellation at period end
   3. Check subscription status
   4. Test reactivation before period end
   ```

### 4. Usage Tracking Testing

#### Test Cases:
- [ ] AI query limits are enforced
- [ ] Document upload limits are enforced
- [ ] Custom document download limits are enforced
- [ ] Usage counters increment correctly
- [ ] Usage resets monthly
- [ ] Billing alerts are created at 80% and 100% usage

#### Steps:
1. **Test AI Query Limits:**
   ```
   1. Use AI chat feature up to tier limit
   2. Verify usage counter increments
   3. Attempt to exceed limit
   4. Verify error message and prevention
   5. Check billing alerts creation
   ```

2. **Test Document Limits:**
   ```
   1. Upload documents up to tier limit
   2. Verify usage tracking
   3. Attempt to exceed limit
   4. Verify prevention and error handling
   ```

### 5. Webhook Testing

#### Test Cases:
- [ ] Subscription created webhook updates database
- [ ] Subscription updated webhook updates database
- [ ] Subscription cancelled webhook updates database
- [ ] Payment succeeded webhook logs payment
- [ ] Payment failed webhook handles failure

#### Steps:
1. **Test Webhook Delivery:**
   ```
   1. Create subscription via Stripe Dashboard
   2. Check Supabase logs for webhook processing
   3. Verify database updates
   4. Test webhook with invalid signature
   5. Verify error handling
   ```

2. **Test Webhook Events:**
   ```
   1. Trigger each webhook event type
   2. Verify appropriate database changes
   3. Check error logs for any issues
   ```

### 6. Error Handling Testing

#### Test Cases:
- [ ] Invalid subscription tier handling
- [ ] Network error handling
- [ ] Stripe API error handling
- [ ] Database error handling
- [ ] Authentication error handling

#### Steps:
1. **Test Error Scenarios:**
   ```
   1. Attempt subscription without authentication
   2. Use invalid price IDs
   3. Simulate network failures
   4. Test with expired Stripe keys
   5. Verify appropriate error messages
   ```

## Test Data

### Stripe Test Cards

Use these test cards for different scenarios:

- **Successful Payment:** `4242 4242 4242 4242`
- **Declined Payment:** `4000 0000 0000 0002`
- **Insufficient Funds:** `4000 0000 0000 9995`
- **Expired Card:** `4000 0000 0000 0069`
- **Processing Error:** `4000 0000 0000 0119`

### Test Users

Create test users with different subscription tiers:

1. **Free User:** No subscription
2. **Premium User:** Active Premium subscription
3. **Pro User:** Active Pro subscription
4. **Cancelled User:** Cancelled subscription (active until period end)

## Monitoring and Debugging

### 1. Logs to Monitor

- Supabase Edge Function logs
- Stripe webhook logs
- Browser console errors
- Database query logs

### 2. Key Metrics

- Subscription conversion rates
- Payment success/failure rates
- Usage limit violations
- Webhook delivery success rates

### 3. Debugging Tools

- Stripe Dashboard webhook logs
- Supabase Dashboard function logs
- Browser DevTools Network tab
- Database query logs

## Post-Testing Checklist

After completing all tests:

- [ ] All test cases pass
- [ ] Error handling works correctly
- [ ] Database is in consistent state
- [ ] Webhook endpoints are properly configured
- [ ] Environment variables are set correctly
- [ ] Edge functions are deployed and working
- [ ] Stripe products and prices are configured
- [ ] Usage tracking is accurate
- [ ] Billing alerts are working
- [ ] Payment flows are smooth
- [ ] User experience is intuitive

## Production Deployment

Before going live:

1. **Update Environment Variables:**
   - Replace test Stripe keys with live keys
   - Update webhook endpoints to production URLs

2. **Create Production Stripe Products:**
   - Set up live products and prices
   - Update price IDs in constants

3. **Configure Production Webhooks:**
   - Set up webhook endpoints in live Stripe account
   - Test webhook delivery in production

4. **Monitor Initial Transactions:**
   - Watch for any issues with live payments
   - Monitor webhook delivery
   - Check database consistency

## Support and Troubleshooting

For issues during testing:

1. Check Supabase function logs
2. Verify Stripe webhook delivery
3. Confirm database schema is up to date
4. Validate environment variables
5. Test with different browsers/devices
6. Check network connectivity
7. Verify Stripe account configuration

Remember to test thoroughly in the development environment before deploying to production!
