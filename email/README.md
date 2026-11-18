# Email

The collective's mail house. Staff build recipient lists, write templates and send campaigns.
Other houses send one-to-one transactional mail (magic links, confirmations) through it, so
there is one provider account, one sending domain and one suppression list.

| Package | Port | |
|---|---|---|
| `email/web` | 3009 | the staff dashboard (`/staff`) and the public unsubscribe pages |
| `email/api` | 4010 | everything else; the only thing that touches `itc_email` |

Staff sign in with their CMS account. The `email` space exists only for that and has no content.

## How a campaign send works

- **Test first.** On a draft campaign, *Send test* mails one `[Test]` copy to you, rendered with the
  first contact's fields.
- **Sent once.** *Send* moves the campaign from draft to sending in one atomic update. A second
  press, or a second staff member, gets "already sent".
- **Each person at most once.** Before calling the provider, the api writes a `pending` send record
  that is unique per (campaign, contact). A contact who already has one is skipped.
- **Restarts resume.** The sending worker holds a two-minute lease and renews it after every message.
  If the process dies, the lease runs out and the next boot (or any running instance, within two
  minutes) picks the campaign back up and carries on from the next contact. Anyone left `pending` by
  the dead worker is marked failed, not retried: whether the provider got their message is unknown,
  and a gap is better than a duplicate.
- **Merge tags.** `{{first_name}}` inserts a CSV column. `{{first_name|friend}}` falls back when it's
  missing. If a template uses a tag the list has no column for and no fallback covers, the campaign
  page warns you, and Send asks you to confirm.

## Unsubscribes, bounces and complaints

- Every campaign message has a footer link to the unsubscribe page. It also carries
  `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers, pointing at
  `email/web`'s `/unsubscribe/<token>/one-click`. Gmail and Yahoo require these for bulk mail. A GET
  to that URL never unsubscribes, because link scanners fetch every URL in a message.
- An unsubscribe, a hard bounce or a spam complaint suppresses the address everywhere: every list,
  every future campaign.
- Bounces and complaints arrive by webhook (`/webhooks/resend` or `/webhooks/postmark`). Soft bounces
  are ignored.
- On Postmark, campaign mail goes on a broadcast stream (`POSTMARK_BROADCAST_STREAM`) and
  transactional mail on `outbound`, as Postmark requires.

## Transactional mail, for other houses

```http
POST /transactional
X-Service-Key: <the calling house's key from EMAIL_SERVICE_KEYS>
Content-Type: application/json

{ "to": "a@example.org", "category": "magic-link", "subject": "Your sign-in link",
  "markdown": "[Sign in](https://id.itc.org/…)\n\nThis link works for 15 minutes." }
```

- **Responses:** `200 { ok, id, delivered }`. `delivered` is false under the `log` provider. A `409`
  means the address hard-bounced or complained before. A marketing unsubscribe does *not* block
  transactional mail, and no unsubscribe footer is added.
- **Limits and logging:** 120 messages a minute per house. Bodies are never stored. Staff can see
  who sent what on the dashboard's **Sending** page.

## Going live

Only a person can do these. The dashboard's **Sending** page checks each one live, including real
DNS lookups, so do them in order and reload it after each step.

1. **Choose a provider and get a key.** Make a Resend or Postmark account and set `MAIL_PROVIDER`
   and `MAIL_API_KEY`. On Postmark, also create a *Broadcast* message stream and set
   `POSTMARK_BROADCAST_STREAM` to its id.
2. **Add the sending domain in the provider**, then add the DNS records it shows you at your DNS host:
   - SPF (TXT)
   - DKIM (TXT, or CNAME on Postmark)
   - Resend's `send.` MX and TXT records, or Postmark's Return-Path CNAME
3. **Add a DMARC record** at `_dmarc.<domain>`. To start: `v=DMARC1; p=none; rua=mailto:dmarc@<domain>`.
   Tighten it to `quarantine` once reports look clean.
4. **Set `MAIL_FROM`** to an address on that domain, e.g. `ITC <hello@itc.org>`.
5. **Set the public HTTPS addresses.** `WEB_URL` is `email/web`'s public address, used for
   unsubscribe links. `API_PUBLIC_URL` is this api's public address, used for webhooks.
6. **Set up the webhooks.**
   - Resend: add a webhook for `email.bounced` and `email.complained` pointing at
     `<API_PUBLIC_URL>/webhooks/resend`, and put its signing secret in `MAIL_WEBHOOK_SECRET`.
   - Postmark: set `MAIL_WEBHOOK_SECRET` to a long random string, and add a webhook for Bounce,
     Spam Complaint and Subscription Change pointing at
     `https://hook:<secret>@<api host>/webhooks/postmark`.
7. **Give each house that sends magic links or confirmations its own key** in `EMAIL_SERVICE_KEYS`.
8. **Send a test campaign to yourself.** In Gmail, use *Show original* to check that SPF, DKIM and
   DMARC all say `PASS` and that the *Unsubscribe* button appears next to the sender.
