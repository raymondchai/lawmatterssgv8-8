# Stripe Checkout Setup Guide

This guide will help you set up Stripe checkout with Supabase Edge Functions for your legal services application.

## Prerequisites

1. **Stripe Account**: Create a Stripe account at [stripe.com](https://stripe.com)
2. **Supabase Project**: You should already have a Supabase project set up
3. **Supabase CLI**: Install the Supabase CLI for deploying Edge Functions

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

## Step 2: Set up Stripe Products and Prices

1. Log into your Stripe Dashboard
2. Go to **Products** → **Add Product**
3. Create the following products with their respective prices:

### Legal Consultation
- **Name**: Legal Consultation
- **Description**: 1-hour legal consultation
- **Price**: $150.00
- **Type**: One-time payment
- Copy the **Price ID** (starts with `price_`)

### Document Review
- **Name**: Document Review  
- **Description**: Professional document review service
- **Price**: $250.00
- **Type**: One-time payment
- Copy the **Price ID**

### Contract Drafting
- **Name**: Contract Drafting
- **Description**: Custom contract drafting service
- **Price**: $500.00
- **Type**: One-time payment
- Copy the **Price ID**

## Step 3: Update Price IDs

Update the price IDs in `src/lib/stripe-service.ts`:

```typescript
export const LEGAL_SERVICE_PRICES = {
  consultation: {
    id: 'price_YOUR_CONSULTATION_PRICE_ID', // Replace with actual Price ID
    name: 'Legal Consultation',
    description: '1-hour legal consultation',
    amount: 15000,
  },
  document_review: {
    id: 'price_YOUR_DOCUMENT_REVIEW_PRICE_ID', // Replace with actual Price ID
    name: 'Document Review',
    description: 'Professional document review service',
    amount: 25000,
  },
  contract_drafting: {
    id: 'price_YOUR_CONTRACT_DRAFTING_PRICE_ID', // Replace with actual Price ID
    name: 'Contract Drafting',
    description: 'Custom contract drafting service',
    amount: 50000,
  },
}
```

## Step 4: Configure Environment Variables

### Local Development (.env.local)
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### Supabase Edge Function Environment Variables

In your Supabase project dashboard:

1. Go to **Settings** → **Edge Functions**
2. Add the following environment variables:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 5: Deploy the Edge Function

1. **Login to Supabase CLI**:
```bash
supabase login
```

2. **Link your project**:
```bash
supabase link --project-ref your-project-ref
```

3. **Deploy the Edge Function**:
```bash
supabase functions deploy create-checkout-session
```

## Step 6: Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. Navigate to `/dashboard` after signing in
3. Try purchasing one of the legal services
4. You should be redirected to Stripe Checkout
5. Use Stripe's test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`

## Step 7: Production Setup

### For Production Deployment:

1. **Use Live Stripe Keys**:
   - Replace test keys with live keys (pk_live_... and sk_live_...)
   
2. **Update Success/Cancel URLs**:
   - The Edge Function automatically uses the request origin
   - Ensure your production domain is properly configured

3. **Configure Webhooks** (Optional but recommended):
   - Set up Stripe webhooks to handle payment confirmations
   - Create another Edge Function to handle webhook events

## Troubleshooting

### Common Issues:

1. **"Unauthorized" Error**: Check that your Supabase auth is working and the user is logged in
2. **"Price ID not found"**: Verify your Stripe Price IDs are correct
3. **CORS Errors**: Ensure the Edge Function includes proper CORS headers
4. **Environment Variables**: Double-check all environment variables are set correctly

### Testing Checklist:

- [ ] User can sign up/sign in
- [ ] Dashboard loads correctly
- [ ] Stripe checkout opens when clicking purchase buttons
- [ ] Test payments work with Stripe test cards
- [ ] Success/cancel redirects work properly
- [ ] Payment success messages appear

## Security Notes

- Never expose your Stripe secret key in client-side code
- Always validate payments on the server side (Edge Function)
- Use Stripe webhooks for production to handle payment confirmations
- Implement proper error handling and logging

## Next Steps

Consider implementing:
- Payment history tracking in your database
- Email receipts
- Subscription-based services
- Refund handling
- Invoice generation
