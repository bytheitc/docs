---
title: Zakat Kit
description: Works out the zakat you owe, in your own currency, with the working shown, plus tools for businesses.
---

Zakat Kit takes the four lookups and the arithmetic out of zakat: what nisab is, today's metal price, which of your things count, and what to subtract. It shows its working, and where scholars differ, it shows both views and lets you choose.

**Repository:** [bytheitc/zakat](https://github.com/bytheitc/zakat) · TypeScript, Next.js

## What it does

- **Zakat on wealth**, in your own currency (guessed from your region, changeable). Enter what you hold and owe, choose the gold or silver nisab, and see the amount with the full working.
- **Every account at once.** Drop in statements from several banks (CSV, OFX, QFX, QIF or JSON). Files are read in your browser and never uploaded. Holdings in other currencies are converted at rates you enter.
- **Zakat al-Fitr**: one *ṣāʿ* per person, shown in kilograms and in money.
- **A monthly plan** that takes sadaqah and savings out at the same time as fixed costs.
- **For businesses**: business zakat, and an audit that reads a statement and flags interest and other income to purify, and spending to review.

## What it is not

**A calculator, not a ruling.** It does arithmetic on the numbers you enter, and makes no attempt to settle questions scholars differ on. Where they differ (gold or silver nisab, lunar or solar year, al-Fitr in food or money) it offers both and names them.

## Privacy

Nothing leaves your device unless you make an account. If you do, your figures are encrypted in your browser before they are saved, with a key made from your password, so the server holds only ciphertext. Whoever runs the server can't read them.

## Hosting your own

See [Hosting your own](/self-hosting).
