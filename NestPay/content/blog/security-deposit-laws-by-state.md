---
title: "Security Deposit Laws by State: What Small Landlords Need to Know"
description: "Security deposit rules vary wildly between states — caps, trust accounts, interest, return deadlines. A practical reference for the most common landlord questions."
date: "2026-06-04"
author: "Rentidge"
tags: ["security deposit", "compliance", "landlord-tenant law"]
---

Security deposits are one of the most regulated parts of being a landlord. Each state has its own rules about how much you can collect, how you must hold it, when you have to return it, and what counts as a legitimate deduction. Getting this wrong is one of the easiest ways to lose in landlord-tenant court — many states allow tenants to recover 2× or 3× the deposit if you mishandle it.

This is a practical reference for the most common state-by-state differences. Treat it as a starting point, not legal advice.

## What's regulated, in plain English

State security-deposit law usually addresses four things:

1. **How much you can charge.** Most states cap deposits at 1–2× monthly rent. A few have no cap.
2. **Where you have to hold it.** Some states require a separate trust account (no commingling with operating funds). Some require an interest-bearing account.
3. **When you have to return it.** Most states require return within 14–30 days of move-out, with an itemized statement of any deductions.
4. **What you can deduct.** Damages beyond normal wear and tear, unpaid rent, unpaid utilities (sometimes). What you cannot deduct: ordinary wear, repainting after 2+ years of tenancy, normal carpet cleaning in most states.

## State summary table

| State | Deposit cap | Trust account required | Interest required | Return deadline |
|---|---|---|---|---|
| California | 2× rent (unfurnished) | No | No | 21 days |
| New York | 1× rent | Yes, separate | Yes if >5 units | 14 days |
| New Jersey | 1.5× rent | Yes, separate | Yes | 30 days |
| Massachusetts | 1× rent | Yes, separate | Yes | 30 days |
| Illinois | No cap | Yes if 25+ units | Yes if 25+ units | 30–45 days |
| Connecticut | 2× rent (1× if 62+) | Yes | Yes | 30 days |
| Texas | No cap | No | No | 30 days |
| Florida | No cap | Yes, separate | If interest-bearing acct | 15–60 days |
| Washington | No cap | Yes, separate | No | 30 days |
| Oregon | No cap | No | No | 31 days |

Always confirm against your state's current statute — laws change. This table reflects June 2026.

## The "trust account" question — what it actually means

In states that require a trust account, you can't deposit security deposits into your regular business or personal checking account. You need a separate account, often interest-bearing, and you typically have to disclose where it's held to the tenant within 30 days of receiving the deposit.

Why does this exist? Because the deposit is the tenant's money — you're holding it in trust. If your business goes bankrupt, the deposit shouldn't be lumped in with your other assets.

**The commingling problem.** If you mix deposits into your operating funds (even briefly), you've technically commingled. In strict states, this exposes you to penalties even if the deposit is eventually returned in full. A separate account is cheap insurance.

## Return deadlines — and what an itemized statement should include

Most states require you to provide an itemized statement of deductions when you return the (partial) deposit. A good itemized statement includes:

- A copy of the move-in inspection report
- A copy of the move-out inspection report (with photos if possible)
- A line item for each deduction with the amount and reason
- Receipts or estimates for any contracted work (cleaning, repairs)
- The remaining balance being returned

States that allow tenants to sue for 2× or 3× the deposit for non-compliance treat "no itemized statement" as automatic non-compliance — you can return the full deposit on time and still lose because you didn't paper it correctly.

## What counts as a deductible damage

The dividing line is "damage beyond normal wear and tear." Common examples:

**Generally deductible:**
- Holes in the wall larger than a small nail
- Stained or burned carpets (beyond what cleaning fixes)
- Broken appliances (if not from manufacturer defect)
- Pet damage (unless you accepted pet rent / deposit)
- Unpaid rent or fees
- Cost of replacing missing items (keys, smoke detectors, etc.)

**Generally NOT deductible:**
- Faded paint after 2+ years
- Worn carpet in high-traffic areas after multiple years
- Small nail holes (1 or 2 per wall is usually considered normal)
- Cleaning fees for an already-clean unit
- "Refresh painting" because new tenants are coming

When in doubt, the question to ask is: "Would a reasonable person consider this damage that the tenant caused, beyond the wear any tenant would inflict by living here normally?"

## How Rentidge handles deposits

Rentidge lets you charge security deposits per-unit (you set the amount when adding a unit) and collect them either bundled with the move-in payment or as a separate transaction. The held amount is tracked on the tenant record so you always know what you owe back.

The current implementation routes deposits through your standard Stripe Connect account — same as rent. If you're in a strict state that requires a separate trust account (NJ, NY, MA, IL, CT), you should consult counsel about whether this satisfies your jurisdiction's requirements. A dedicated trust-account feature is on the Rentidge roadmap for states that require it.

For deposit returns at move-out, the current workflow is: use Stripe Refunds to send the (possibly partial) deposit back to the tenant's card, and provide your itemized statement separately. An in-app itemized-return workflow is also on the roadmap.

---

*This article is general information, not legal advice. Security deposit law changes frequently and varies by jurisdiction. Consult a real-estate attorney for advice specific to your situation.*
