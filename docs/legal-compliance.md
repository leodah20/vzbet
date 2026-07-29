# Legal & Compliance Notes

This document records the reasoning behind design decisions that affect regulatory compliance
and data protection. Keeping this reasoning written down is itself part of the point of this
project: it shows the decision was made deliberately, not overlooked.

## 1. Lei 14.790/2023 and why VZBet is not a betting operator

Lei 14.790/2023 is Brazil's regulatory framework for fixed-odds, real-money betting ("apostas de
quota fixa"). Operating a real-money betting product under this law requires authorization from
the SPA/MF (Secretaria de Prêmios e Apostas do Ministério da Fazenda), and that authorization
carries capital requirements: **R$30M** in corporate capital (capital social), a further **R$30M**
grant/licensing fee (outorga), and a **R$5M** reserve fund. Those figures put real-money betting
entirely out of reach for an indie project.

**Design decision:** VZBet was deliberately pivoted away from a real-money betting concept into a
score-prediction pool. No real money ever moves through the app, at any point:

- Fans submit a predicted score for a match before kickoff.
- Accuracy is scored by a fixed, transparent rule — an exact score is worth 3 points, a correct
  outcome (home win / away win / draw) with the wrong exact score is worth 1 point, and a wrong
  outcome is worth 0 points. A cancelled match's predictions never score.
- The ranking is a plain sum of points per user — nothing is staked, and nothing is paid out by
  the platform.
- The domain model (`User`, `Team`, `Player`, `Championship`, `Match`, `Prediction`) has no
  concept of a wallet, a stake, odds, or a payout anywhere in it, and the codebase has no payment
  integration of any kind.
- If a group of fans wants to attach a real prize to their own prediction pool, that is arranged
  entirely outside the app — VZBet has no visibility into it and takes no part in it.

Because the platform never handles consideration (a stake) or a payout, VZBet falls outside the
scope of Lei 14.790/2023 as it is currently built. This is the single most important compliance
decision behind the project's existence, and it needs to stay true of any future feature: if a
change is ever proposed that would make real money move through VZBet, this section must be
revisited before that feature ships.

## 2. LGPD (Lei Geral de Proteção de Dados)

Precisely because VZBet never touches money, its personal-data footprint is small and easy to
reason about. For a registered fan, the schema (`User`, `Team`, `Player`, `Championship`, `Match`,
`Prediction`) stores:

- Name
- Email (unique, used for login)
- Password hash (bcrypt, cost factor 10 — never the plaintext password, never logged)
- Predictions submitted (predicted home/away score per match, tied to the user's id)
- An account creation timestamp

That is the entire footprint. There is no payment data, no financial/transaction data, no address,
no document numbers, no third-party OAuth profile data, and no device or location tracking
implemented anywhere in the backend.

Security measures already in place around this data:

- Passwords are hashed with bcrypt before storage and are never stored or logged in plaintext.
- JWTs carry only `{ sub: userId, role }` — never the full user record, never the password hash.
- Login uses a constant-time comparison path (a fixed dummy bcrypt hash is compared against when
  the email doesn't match any account), specifically so response timing can't be used to tell
  "no such account" apart from "wrong password."
- The app refuses to boot if the `JWT_SECRET` environment variable is missing, rather than
  silently falling back to a default secret that could let an attacker forge tokens.
- The two roles (`ADMIN`, `TORCEDOR`) are cleanly separated: public registration has no `role`
  field at all, so there is no request path that can self-assign `ADMIN`; promotion to `ADMIN`
  only happens by hand, directly in the database.

**Design decision:** because the data footprint is minimal and there is no real-money handling to
secure, LGPD compliance work for VZBet is scoped to standard account-data hygiene, rather than the
much heavier obligations (payment data, KYC records, transaction history) a real-money product
would carry.

Open items worth tracking, not yet addressed as of this writing:

- No endpoint currently exists for a user to export or delete their own personal data (the full
  endpoint list has no such route) — LGPD's data-subject rights (access, correction, deletion)
  will need one before the app has real users.
- No public privacy policy has been written yet stating what is collected and on what legal
  basis (consent at registration is the assumed basis, but this hasn't been documented anywhere
  user-facing).
- There is no rate limiting on `/auth/login` yet.
- A role change (e.g., revoking `ADMIN`) can take up to 7 days to fully propagate, since JWTs are
  valid for 7 days and there is no revocation mechanism — relevant because `ADMIN` promotion is a
  manual, direct database action.
- Encryption in transit and at rest for the production database has not yet been configured or
  verified, since the Render deployment itself is a planned, not-yet-started phase.
