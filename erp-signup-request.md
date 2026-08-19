# Request: Customer registration endpoint for website sign-up

The Tenon Hardware website now has a sign-up page (`signup.html`) that
collects: first name, last name, email, phone, and password (with a
confirm-password check and a terms checkbox done client-side).

On submit, it currently calls `POST /api/auth/register`, which doesn't
exist yet — that's the ask.

## Proposed payload — POST /api/auth/register

```json
{
  "first_name": "Ahmed",
  "last_name": "Hassan",
  "email": "ahmed@example.com",
  "phone": "+960 7XXXXXX",
  "password": "plaintext-from-form"
}
```

## Expected response

- **Success**: either
  - `{ "token": "...", "data": { ... } }` — website logs the customer
    in immediately and redirects to the homepage, same as
    `POST /api/auth/login`, **or**
  - a simple `{ "data": { ... } }` with no token — website shows
    "Account created, please sign in" and sends them to `login.html`.

  Either is fine; the website handles both (token present vs absent).
  Let us know which one to expect.

- **Errors** (e.g. email already registered, weak password): return a
  non-2xx status with `{ "message": "..." }` — the website displays
  `message` directly in the form's error banner.

## Open questions

1. Is email uniqueness enforced server-side? The website doesn't
   pre-check.
2. Any password policy beyond the 8-character minimum the form
   currently enforces client-side?
3. Should this endpoint also create/link a customer record used for
   order history, or is that a separate step?
4. Same `x-api-key` header as the other `/api/*` endpoints, or does
   this one need different auth handling since it's for anonymous
   sign-up?
