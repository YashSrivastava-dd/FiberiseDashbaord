# AiSensy Complete Setup Guide — FYBER WhatsApp Automation

Everything you need to configure inside AiSensy and your `.env` file to make the WhatsApp Journey Automation System work end-to-end.

---

## Step 1: Get Your AiSensy API Key

### Where to Find It

1. Login to **[AiSensy Dashboard](https://app.aisensy.com)**
2. Click **⚙️ Manage** (bottom-left sidebar)
3. Click **API Key** 
4. You'll see your API key displayed — copy it

> [!IMPORTANT]
> Your API key looks something like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0N...`
> It's a long JWT token string. Copy the **entire** string.

### Put in `.env`

```env
AISENSY_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0N...your_full_key_here
```

---

## Step 2: Create WhatsApp Message Templates

You need **5 templates** for the FYBER journey. These must be created and **approved by Meta** before you can send them.

### How to Create Templates

1. In AiSensy Dashboard → Click **📋 Templates** (left sidebar)
2. Click **+ Create Template**
3. Fill in the template details for each one below

> [!NOTE]
> **Variable format:** AiSensy uses positional variables `{{1}}, {{2}}, {{3}}...`
> Your backend will fill these in automatically with real customer data.

---

### Template 1: Welcome Message — Order Delivered (Day 0)

**Trigger:** Sent when order is delivered
**Type:** All orders

| Field | Value |
|---|---|
| **Template Name** | `fyber_welcome_delivered` |
| **Category** | `UTILITY` |
| **Language** | `English` |
| **Header** | (Optional) Image — your FYBER product image |
| **Body** | See below |
| **Footer** | (Optional) `FYBER — Your Wellness Partner 🤍` |

**Body Text:**
```
👀 Losing weight may finally start feeling easier… 📦✨

Your FYBER has arrived 🤍

Hi {{1}}! This is your first step towards feeling lighter, healthier & more confident 🤍

FYBER is designed to help you lose weight and feel fuller naturally 🍽️✨
So managing cravings, portions control & weight loss starts feeling easier 😊

How to use 👇
🥤 Mix 1 sachet in a glass of water
⏰ Drink 45–60 min before meals
✅ That's it !

Most people first notice:

✔️ You feel fuller for longer 🍽️
✔️ Your portion sizes reduce naturally ✨
✔️ You feel more energetic through the day ⚡

Small daily changes create real transformation 🌱

We're so excited for your journey 💫
Welcome to the FYBER family 🤍
```

**Variables:** `{{1}}` = customer_name

---

### Template 2: Daily Reminder (Day 1)

**Trigger:** Sent next day after delivery, around 4 PM
**Type:** All orders

| Field | Value |
|---|---|
| **Template Name** | `fyber_daily_reminder` |
| **Category** | `UTILITY` |
| **Language** | `English` |

**Body Text:**
```
✨ Tiny FYBER reminder ✨

Hi {{1}} ! Did you take your FYBER today ? 🤍🥤

It works best before meals 🍽️
But if you forgot, you can still have it later too ✨

The more consistently you take it, the more you may start noticing 👀

✔️ Your stomach feels more cleared in the morning ☁️
✔️ Better energy through the day ⚡
✔️ More control over random snacking 🍫🙅‍♀️
✔️ Smaller portions feeling enough 🍽️✨

No crash dieting. Just small daily changes that actually feel sustainable 🌱🤍

Your transformation journey has officially started 💫
```

**Variables:** `{{1}}` = customer_name

---

### Template 3: Early Wins Check-in (Day 3)

**Trigger:** Sent on Day 3 of the journey
**Type:** All orders

| Field | Value |
|---|---|
| **Template Name** | `fyber_early_wins` |
| **Category** | `MARKETING` |
| **Language** | `English` |

**Body Text:**
```
Hey {{1}} ! 🌟

It's been 3 days since you started FYBER 💫

Are you noticing anything different ? Even small things count 🤍

Some things our FYBER family notices around this time 👇

✔️ Feeling less bloated after meals 🍽️
✔️ Not reaching for snacks as often 🍫✋
✔️ Mornings feel a little lighter ☁️✨
✔️ More mindful about what you eat 🧠

Your body is adjusting, even if you can't fully feel it yet 🌱

The best part ? You're building a habit that actually sticks 💪

Keep going {{1}} ! You're doing amazing 🤍💫
```

**Variables:** `{{1}}` = customer_name

---

### Template 4: Craving Control Tips (Day 5)

**Trigger:** Sent on Day 5 of the journey
**Type:** All orders

| Field | Value |
|---|---|
| **Template Name** | `fyber_craving_tips` |
| **Category** | `MARKETING` |
| **Language** | `English` |

**Body Text:**
```
Hi {{1}} ! 🧠✨

Day 5 — let's talk about cravings 🍫👀

We all get them. And that's totally okay 🤍

Here's what actually helps 👇

🥤 Take your FYBER 45 min before meals — it helps you feel fuller naturally
💧 Drink a glass of water when a craving hits
🚶‍♀️ Take a 5 minute walk — it actually works !
🍵 Switch to green tea or herbal tea after dinner

The goal isn't to fight cravings 🙅‍♀️
It's to make your body feel so satisfied that cravings naturally reduce ✨

FYBER does exactly that — it helps you feel full, so you eat less without even trying 🍽️💫

You're almost a week in {{1}} ! That's incredible 🎉🤍
```

**Variables:** `{{1}}` = customer_name

---

### Template 5: One Week Celebration (Day 7)

**Trigger:** Sent on Day 7 of the journey
**Type:** All orders

| Field | Value |
|---|---|
| **Template Name** | `fyber_week_one` |
| **Category** | `MARKETING` |
| **Language** | `English` |

**Body Text:**
```
🎉 1 WEEK with FYBER ! 🎉

{{1}}, you've officially completed your first week 💫🤍

That's 7 days of showing up for yourself ✨
That's 7 days of choosing better 🌱
That's 7 days closer to the version of you that you're working towards 💪

By now, many people in the FYBER family report 👇

✔️ Noticeably less bloating ☁️
✔️ Smaller portions feeling satisfying 🍽️
✔️ Better bathroom routine 😊
✔️ Fewer cravings during the day 🍫✋
✔️ Feeling lighter overall ✨

Remember — the real magic happens between week 2 and week 4 🪄

Keep going {{1}} ! We believe in you 🤍💫

Still have questions ? Just reply here — we're always around ! 💬
```

**Variables:** `{{1}}` = customer_name

---

### Approval Process

1. After creating each template, click **Submit for Approval**
2. Meta reviews templates within **24-48 hours** (usually faster)
3. Status will change from `PENDING` → `APPROVED` ✅
4. **You cannot send templates until they are APPROVED**

> [!WARNING]
> **Common rejection reasons:**
> - Using "WhatsApp" in the template text
> - Unclear opt-out instructions for marketing templates
> - Too many emojis in UTILITY templates (keep UTILITY clean, MARKETING can be emoji-rich)
> 
> **Tip:** Templates 1 & 2 are `UTILITY` (transactional/info), Templates 3-5 are `MARKETING` (promotional). Meta is stricter with MARKETING templates — make sure your WhatsApp Business is verified.

---

## Step 3: Create API Campaigns (CRITICAL STEP)

> [!CAUTION]
> **This is the most important step!** Without API Campaigns, your backend cannot send messages. Each template needs its own API Campaign set to "Live".

### How to Create an API Campaign

1. In AiSensy Dashboard → Click **📢 Campaigns** (left sidebar)
2. Click **+ Launch** (top right)
3. Select **API Campaign**
4. Give it a name, select the template, and set to **Live**

For **each template**, create a campaign:

### Campaign 1: Welcome Delivered

| Field | Value |
|---|---|
| **Campaign Name** | `fyber_welcome_campaign` |
| **Template** | Select `fyber_welcome_delivered` |
| **Status** | Set to **Live** ✅ |

### Campaign 2: Daily Reminder

| Field | Value |
|---|---|
| **Campaign Name** | `fyber_reminder_campaign` |
| **Template** | Select `fyber_daily_reminder` |
| **Status** | Set to **Live** ✅ |

### Campaign 3: Early Wins

| Field | Value |
|---|---|
| **Campaign Name** | `fyber_early_wins_campaign` |
| **Template** | Select `fyber_early_wins` |
| **Status** | Set to **Live** ✅ |

### Campaign 4: Craving Tips

| Field | Value |
|---|---|
| **Campaign Name** | `fyber_craving_tips_campaign` |
| **Template** | Select `fyber_craving_tips` |
| **Status** | Set to **Live** ✅ |

### Campaign 5: Week One Celebration

| Field | Value |
|---|---|
| **Campaign Name** | `fyber_week_one_campaign` |
| **Template** | Select `fyber_week_one` |
| **Status** | Set to **Live** ✅ |

> [!IMPORTANT]
> The **Campaign Name** is what your backend uses to send messages via the API. It must match **exactly** what you enter in your dashboard's Templates page at `/whatsapp/templates`.

---

## Step 4: Get Your Project/Campaign Name for `.env`

The `AISENSY_CAMPAIGN_NAME` in `.env` is your **default fallback campaign name**. Each template in your dashboard can override this with its own campaign name.

### Put in `.env`

```env
AISENSY_CAMPAIGN_NAME=fyber_welcome_campaign
```

> [!TIP]
> This is just the default. Each template mapping in your dashboard has its own "Campaign Name" field that takes priority. So set this to your most common one (welcome message).

---

## Step 5: Complete `.env` Configuration

Your final `.env` should have these 3 AiSensy lines:

```env
# AiSensy WhatsApp Integration
AISENSY_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_full_api_key
AISENSY_CAMPAIGN_NAME=fyber_welcome_campaign
AISENSY_BASE_URL=https://backend.aisensy.com/campaign/t1/api/v2
```

### Where to find each value:

| Variable | Where to Find |
|---|---|
| `AISENSY_API_KEY` | AiSensy → ⚙️ Manage → API Key |
| `AISENSY_CAMPAIGN_NAME` | The name you gave your default API Campaign in Step 3 |
| `AISENSY_BASE_URL` | Always `https://backend.aisensy.com/campaign/t1/api/v2` (don't change) |

---

## Step 6: Map Templates in Your Dashboard

After completing Steps 1-5, go to your dashboard at **`http://localhost:3000/whatsapp/templates`** and create 5 template mappings:

Click **"Map Template"** for each:

### Mapping 1 — Welcome (Day 0)
| Field | Value |
|---|---|
| Template Name | `fyber_welcome_delivered` |
| AiSensy Campaign Name | `fyber_welcome_campaign` |
| Day Number | `0` |
| Message Preview | `Welcome message — FYBER has arrived, how to use instructions` |
| Variables | `customer_name` |
| Active | ✅ On |

### Mapping 2 — Daily Reminder (Day 1)
| Field | Value |
|---|---|
| Template Name | `fyber_daily_reminder` |
| AiSensy Campaign Name | `fyber_reminder_campaign` |
| Day Number | `1` |
| Message Preview | `Daily FYBER reminder — consistency tips & early benefits` |
| Variables | `customer_name` |
| Active | ✅ On |

### Mapping 3 — Early Wins (Day 3)
| Field | Value |
|---|---|
| Template Name | `fyber_early_wins` |
| AiSensy Campaign Name | `fyber_early_wins_campaign` |
| Day Number | `3` |
| Message Preview | `Day 3 check-in — early wins & habit building motivation` |
| Variables | `customer_name` |
| Active | ✅ On |

### Mapping 4 — Craving Tips (Day 5)
| Field | Value |
|---|---|
| Template Name | `fyber_craving_tips` |
| AiSensy Campaign Name | `fyber_craving_tips_campaign` |
| Day Number | `5` |
| Message Preview | `Craving control tips & how FYBER helps naturally` |
| Variables | `customer_name` |
| Active | ✅ On |

### Mapping 5 — Week One (Day 7)
| Field | Value |
|---|---|
| Template Name | `fyber_week_one` |
| AiSensy Campaign Name | `fyber_week_one_campaign` |
| Day Number | `7` |
| Message Preview | `1 week celebration — progress check & encouragement` |
| Variables | `customer_name` |
| Active | ✅ On |

---

## Step 7: Register Shopify Webhook

1. Go to **Shopify Admin** → **Settings** → **Notifications** → **Webhooks**
2. Click **Create webhook**

| Field | Value |
|---|---|
| Event | `Order creation` |
| URL | `https://your-domain.com/api/webhooks/shopify/order-created` |
| Format | `JSON` |
| API version | `2024-01` |

### For Local Testing (ngrok)

```bash
# Install ngrok if not installed
brew install ngrok

# Start tunnel
ngrok http 3000

# Use the https URL from ngrok output:
# https://abc123.ngrok.io/api/webhooks/shopify/order-created
```

> [!NOTE]
> Your `SHOPIFY_WEBHOOK_SECRET` is already in your `.env`. The webhook endpoint automatically verifies signatures using this secret.

---

## How the Flow Works End-to-End

```
Customer places order on Shopify
        ↓
Shopify sends webhook → /api/webhooks/shopify/order-created
        ↓
Backend verifies HMAC signature
        ↓
Saves customer to Firestore (customers collection)
        ↓
Creates journey document (journeys collection)
        ↓
Day 0 → Sends "fyber_welcome_delivered" via "fyber_welcome_campaign"
        ↓
Calls AiSensy API:
POST https://backend.aisensy.com/campaign/t1/api/v2
{
  "apiKey": "your_key",
  "campaignName": "fyber_welcome_campaign",
  "destination": "+919876543210",
  "userName": "Yash",
  "templateParams": ["Yash"]
}
        ↓
Customer receives FYBER welcome on WhatsApp! ✅🤍
        ↓
Scheduler runs every hour:
  Day 1 → "fyber_daily_reminder"    (FYBER reminder ✨)
  Day 3 → "fyber_early_wins"        (Early wins check-in 🌟)
  Day 5 → "fyber_craving_tips"      (Craving control tips 🧠)
  Day 7 → "fyber_week_one"          (Week 1 celebration 🎉)
        ↓
Journey marked as completed after Day 7 ✅
```

---

## Complete Journey Timeline

| Day | Template | What It Does |
|---|---|---|
| **Day 0** | `fyber_welcome_delivered` | Welcome message with how-to-use instructions |
| **Day 1** | `fyber_daily_reminder` | Gentle reminder to take FYBER, early benefits |
| **Day 3** | `fyber_early_wins` | Check-in on early wins, habit building |
| **Day 5** | `fyber_craving_tips` | Craving control tips, FYBER's role |
| **Day 7** | `fyber_week_one` | Week 1 celebration, progress check |

---

## Checklist

- [ ] Created AiSensy account and verified WhatsApp Business number
- [ ] Copied API Key from AiSensy → Manage → API Key
- [ ] Created all 5 WhatsApp templates with exact body text above
- [ ] Submitted all 5 templates for Meta approval
- [ ] All 5 templates are **APPROVED** by Meta ✅
- [ ] Created 5 **API Campaigns** (one per template) — all set to **Live** ✅
- [ ] Added `AISENSY_API_KEY` to `.env`
- [ ] Added `AISENSY_CAMPAIGN_NAME=fyber_welcome_campaign` to `.env`
- [ ] `AISENSY_BASE_URL` set to `https://backend.aisensy.com/campaign/t1/api/v2`
- [ ] Mapped all 5 templates in dashboard at `/whatsapp/templates`
- [ ] Registered Shopify webhook pointing to `/api/webhooks/shopify/order-created`
- [ ] Tested with a Shopify test order
- [ ] Verified WhatsApp message received on phone 📱🤍
