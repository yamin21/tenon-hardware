# Request: Orders endpoint for website checkout

The Tenon Hardware website now has a working checkout page (`checkout.html`)
with a cart (name, price, qty, image, pulled from `localStorage`), a
delivery section (Ship or Pickup), and a payment section that says
"You'll be redirected to BML Payment Gateway to complete your purchase."

Right now "Pay now" just validates the form and shows a placeholder alert —
nothing is sent to the ERP. We'd like orders placed on the website to show
up in the ERP as real orders.

## Proposed flow

1. **Website → ERP**: On "Pay now", after form validation passes, the
   website calls `POST /api/orders` with the cart + customer + delivery
   details below. ERP creates the order with status `pending_payment` and
   returns an `order_id` (and ideally a reference number to show the
   customer).
2. **Website → BML**: Website redirects the customer to BML using that
   `order_id` as a reference (exact integration TBD — may need a separate
   discussion once BML merchant credentials are available).
3. **BML → ERP**: BML sends a payment confirmation (webhook or redirect
   callback) to the ERP, which updates the order status to `paid` (or
   `payment_failed`).

For now, step 1 is the priority — having orders land in the ERP as
`pending_payment` is useful even before the BML integration is wired up,
since staff could manually follow up on pending orders.

## Proposed payload — POST /api/orders

```json
{
  "fulfillment": "ship",            // "ship" | "pickup"
  "contact": {
    "email_or_phone": "7997970"
  },
  "shipping_address": {             // present when fulfillment = "ship"
    "country": "Maldives",
    "first_name": "Ahmed",
    "last_name": "Hassan",
    "address": "...",
    "apartment": "...",
    "city": "Male",
    "atoll": "...",
    "phone": "+960 7XXXXXX"
  },
  "billing_address": {              // present when "use different billing"
    "country": "Maldives",
    "first_name": "...",
    "last_name": "...",
    "company": "...",
    "address": "...",
    "apartment": "...",
    "city": "...",
    "postal_code": "...",
    "phone": "..."
  },
  "pickup_location": "Tenon Hardware Showroom",  // present when fulfillment = "pickup"
  "items": [
    { "name": "Edge banding - PVC Moulding Tape White Glossy", "sku": "...", "qty": 1, "price": 900.00 }
  ],
  "subtotal": 833.33,   // GST-excluded
  "gst": 66.67,         // 8%
  "shipping": 0,
  "total": 900.00,      // GST-inclusive, matches sum of item prices shown on site
  "payment_method": "bml"
}
```

Notes:
- Item `price` is the GST-inclusive unit price (same number shown on the
  product page and in the cart). The website now back-calculates
  `subtotal`/`gst` from that for display — happy to send either the raw
  totals or just the cart items + let the ERP recompute, whichever is
  easier to keep in sync with the ERP's own GST rate/config.
- We don't currently capture a real `sku` in the cart — only product name,
  price, qty, image URL. If the ERP needs SKU/stock-item IDs to create the
  order line items, let us know and we'll thread the ID through from the
  product/category pages (same way we already thread the image through).
- No customer accounts/auth yet — checkout is guest-only. `email_or_phone`
  is free text for now.

## Open questions for ERP side

1. What should the response look like — just `{ "order_id": ... }`, or
   something richer (order number, estimated totals re-validated
   server-side, etc.)?
2. Where do BML merchant credentials/integration details live — is there
   an existing BML integration in the ERP we can hook into, or does this
   need to be set up from scratch?
3. Should stock be decremented/reserved at `pending_payment`, or only once
   `paid`?
4. Any validation we should handle on the frontend before submitting
   (e.g. required fields), vs. what the ERP will reject/validate itself?

Happy to adjust the payload shape to match whatever's easiest on the ERP
side — this is just a starting proposal based on what the checkout form
currently collects.
