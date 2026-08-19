# Request: Multi-warehouse stock routing for website orders

Separate follow-up to `erp-orders-request.md` (orders endpoint) — flagging
this now so it can be considered while that's being built, but it's fine to
treat as a later phase.

## Context

Stock is held in two locations far apart — **Malé** and **Thinadhoo**. When
an order comes in from the website, the ERP needs to know which warehouse's
stock to deduct from (and potentially split an order across both if a single
location doesn't have enough of an item).

## What the website can provide

The website does **not** do any location detection (no geolocation/IP
lookup) — that's unreliable for distinguishing two specific warehouses and
adds a permission prompt for no real benefit.

Instead, the checkout form already collects this naturally:

- **Ship orders**: City/Island and Atoll fields (free text) are part of the
  shipping address sent in the `POST /api/orders` payload
  (`shipping_address.city`, `shipping_address.atoll`).
- **Pickup orders**: the customer picks a pickup location explicitly —
  currently only "Tenon Hardware Showroom" (Malé) is offered, but this maps
  directly to a warehouse if/when Thinadhoo pickup is added too
  (`pickup_location` field).

## Proposed approach

Treat warehouse selection as a **backend routing decision** made by the ERP
when an order is created, using the atoll/island in the shipping address
(or the pickup location):

1. Maintain a simple atoll → nearest-warehouse mapping (e.g. everything in
   GA/GDh/Addu region → Thinadhoo, everything else → Malé — exact mapping
   TBD based on what makes sense logistically).
2. On order creation, pick the nearest warehouse with sufficient stock for
   each line item. If the nearest warehouse is short, fall back to the
   other (or split the order/line item across both, if that's something
   the ERP already supports for in-store orders).
3. Pickup orders are unambiguous — deduct from the warehouse tied to the
   selected pickup location.

## Open questions

1. Does the ERP already have a concept of multi-location stock
   transfers/splitting for an order, or would this be new?
2. Is there an existing atoll/region → warehouse mapping we should reuse
   (e.g. from how staff currently decide which branch ships an order)?
3. If a single item needs to be split across both warehouses to fulfill one
   order, is that acceptable, or should the order just be routed entirely
   to whichever warehouse can fulfill it in full (even if that means a
   longer delivery for some customers)?
