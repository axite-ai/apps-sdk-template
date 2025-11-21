import { vi } from 'vitest';
import type Stripe from 'stripe';

/**
 * Mock Stripe responses
 */
export const mockStripeResponses = {
    checkoutSession: (plan: string) => ({
      id: 'cs_test_123',
      object: 'checkout.session',
      after_expiration: null,
      allow_promotion_codes: null,
      amount_subtotal: 999,
      amount_total: 999,
      automatic_tax: { enabled: false, liability: null, status: null, provider: null },
      billing_address_collection: null,
      cancel_url: 'http://localhost:3000/pricing',
      client_reference_id: null,
      client_secret: null,
      consent: null,
      consent_collection: null,
      created: Math.floor(Date.now() / 1000),
      currency: 'usd',
      currency_conversion: null,
      custom_fields: [],
      custom_text: {
        after_submit: null,
        shipping_address: null,
        submit: null,
        terms_of_service_acceptance: null,
      },
      customer: 'cus_test_123',
      customer_creation: null,
      customer_details: null,
      customer_email: null,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      invoice: null,
      invoice_creation: null,
      livemode: false,
      locale: null,
      metadata: { plan },
      mode: 'subscription',
      payment_intent: null,
      payment_link: null,
      payment_method_collection: null,
      payment_method_configuration_details: null,
      payment_method_options: null,
      payment_method_types: ['card'],
      payment_status: 'unpaid',
      phone_number_collection: { enabled: false },
      recovered_from: null,
      redirect_on_completion: undefined,
      return_url: undefined,
      saved_payment_method_options: null,
      setup_intent: null,
      shipping_address_collection: null,
      shipping_cost: null,
      shipping_options: [],
      status: 'open',
      submit_type: null,
      subscription: 'sub_test_123',
      success_url: 'http://localhost:3000/pricing/success',
      total_details: null,
      ui_mode: 'hosted',
      url: 'https://checkout.stripe.com/test/session/123',
    }) as unknown as Stripe.Checkout.Session,

    subscription: (plan: string, status: string = 'active') => ({

      id: 'sub_test_123',

      object: 'subscription',

      application: null,

      application_fee_percent: null,

      automatic_tax: { enabled: false, liability: null, disabled_reason: null },

      billing_cycle_anchor: Math.floor(Date.now() / 1000),

      billing_cycle_anchor_config: null,

      billing_thresholds: null,

      cancel_at: null,

      cancel_at_period_end: false,

      canceled_at: null,

      cancellation_details: null,

      collection_method: 'charge_automatically',

      created: Math.floor(Date.now() / 1000),

      currency: 'usd',

      customer: 'cus_test_123',

      days_until_due: null,

      default_payment_method: null,

      default_source: null,

      default_tax_rates: [],

      description: null,

      discounts: [],

      ended_at: null,

      invoice_settings: { issuer: { type: 'self' }, account_tax_ids: [] },

      items: {

        object: 'list',

        data: [],

        has_more: false,

        url: '/v1/subscription_items',

      },

      latest_invoice: null,

      livemode: false,

      metadata: { plan },

      next_pending_invoice_item_invoice: null,

      on_behalf_of: null,

      pause_collection: null,

      payment_settings: null,

      pending_invoice_item_interval: null,

      pending_setup_intent: null,

      pending_update: null,

      schedule: null,

      start_date: Math.floor(Date.now() / 1000),

      status: status as Stripe.Subscription.Status,

      test_clock: null,

      transfer_data: null,

      trial_end: null,

      trial_settings: null,

      trial_start: null,

    }) as unknown as Stripe.Subscription,

  customer: (): Stripe.Customer => ({
    id: 'cus_test_123',
    object: 'customer',
    address: null,
    balance: 0,
    created: Math.floor(Date.now() / 1000),
    currency: null,
    default_source: null,
    delinquent: false,
    description: null,
    discount: null,
    email: 'test@example.com',
    invoice_prefix: 'TEST',
    invoice_settings: {
      custom_fields: null,
      default_payment_method: null,
      footer: null,
      rendering_options: null,
    },
    livemode: false,
    metadata: {},
    name: 'Test User',
    next_invoice_sequence: 1,
    phone: null,
    preferred_locales: [],
    shipping: null,
    tax_exempt: 'none',
    test_clock: null,
  }),
};

/**
 * Create mock Stripe client
 */
export const createMockStripeClient = () => ({
  checkout: {
    sessions: {
      create: vi
        .fn()
        .mockImplementation((params: Stripe.Checkout.SessionCreateParams) =>
          Promise.resolve(
            mockStripeResponses.checkoutSession(
              (params.metadata?.plan as string) || 'basic'
            )
          )
        ),
      retrieve: vi.fn().mockResolvedValue(mockStripeResponses.checkoutSession('pro')),
    },
  },
  subscriptions: {
    retrieve: vi.fn().mockResolvedValue(mockStripeResponses.subscription('pro')),
    update: vi.fn().mockResolvedValue(mockStripeResponses.subscription('pro')),
    cancel: vi
      .fn()
      .mockResolvedValue(mockStripeResponses.subscription('pro', 'canceled')),
  },
  customers: {
    create: vi.fn().mockResolvedValue(mockStripeResponses.customer()),
    retrieve: vi.fn().mockResolvedValue(mockStripeResponses.customer()),
    update: vi.fn().mockResolvedValue(mockStripeResponses.customer()),
  },
  webhooks: {
    constructEvent: vi.fn().mockImplementation((payload, signature, secret) => ({
      id: 'evt_test_123',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: mockStripeResponses.checkoutSession('pro'),
      },
    })),
  },
});
