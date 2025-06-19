import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const signature = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing webhook signature or secret' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const body = await req.text()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Processing webhook event:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, supabaseClient)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabaseClient)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, supabaseClient)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabaseClient)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleSubscriptionChange(subscription: Stripe.Subscription, supabaseClient: any) {
  const userId = subscription.metadata.user_id
  if (!userId) {
    console.error('No user_id in subscription metadata')
    return
  }

  // Determine subscription tier from price ID
  const priceId = subscription.items.data[0]?.price.id
  let tier = 'free'

  // Map price IDs to tiers (these should match your Stripe price IDs)
  if (priceId?.includes('premium')) {
    tier = 'premium'
  } else if (priceId?.includes('pro')) {
    tier = 'pro'
  }

  // Update user's subscription tier
  const { error } = await supabaseClient
    .from('profiles')
    .update({
      subscription_tier: tier,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user subscription:', error)
    throw error
  }

  console.log(`Updated subscription for user ${userId} to tier ${tier}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabaseClient: any) {
  const userId = subscription.metadata.user_id
  if (!userId) {
    console.error('No user_id in subscription metadata')
    return
  }

  // Reset user to free tier
  const { error } = await supabaseClient
    .from('profiles')
    .update({
      subscription_tier: 'free',
      stripe_subscription_id: null,
      subscription_status: 'canceled',
      current_period_start: null,
      current_period_end: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    console.error('Error resetting user subscription:', error)
    throw error
  }

  console.log(`Reset subscription for user ${userId} to free tier`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, supabaseClient: any) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  // Log successful payment
  console.log(`Payment succeeded for subscription ${subscriptionId}`)
  
  // You could store payment history here if needed
  // await supabaseClient
  //   .from('payment_history')
  //   .insert({
  //     stripe_invoice_id: invoice.id,
  //     stripe_subscription_id: subscriptionId,
  //     amount: invoice.amount_paid,
  //     currency: invoice.currency,
  //     status: 'succeeded',
  //     created_at: new Date().toISOString()
  //   })
}

async function handlePaymentFailed(invoice: Stripe.Invoice, supabaseClient: any) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  // Log failed payment
  console.log(`Payment failed for subscription ${subscriptionId}`)
  
  // You could implement retry logic or notifications here
}
