---
title: Khutbah
description: Finds Qur'an quotations in khutbah transcripts, even where speech recognition garbled them, and restores the exact text.
---

Speech recognition garbles exactly the Arabic that matters in an English khutbah. Ayat come out as near-misses: words dropped, misheard, run together. Transcripts and captions then misquote the Qur'an, which is worse than leaving it out.

Khutbah finds every Qur'an quotation in a transcript, even a damaged one, identifies the exact ayat, and puts back the verified text with its reference.

**Repository:** [bytheitc/khutbah](https://github.com/bytheitc/khutbah) · Python 3.10+, no dependencies

```sh
uv run python -m khutbah find talk.txt        # list quotations, with confidence
uv run python -m khutbah annotate talk.txt    # the transcript with quotations restored
uv run pytest                                 # the tests
```

## How it works

1. **Seed.** Every run of three transcript words that also occurs in the Qur'an marks a candidate.
2. **Align.** Around each candidate, transcript and text are aligned word by word, forgiving a misheard letter or a dropped word.
3. **Decide.** A candidate becomes a quotation only if enough words match. Arabic that isn't Qur'an (the salawat, a du'a) isn't matched, even though it's full of Qur'anic words.
4. **Be honest.** Where a phrase occurs in more than one place, every place is reported and the quotation is marked ambiguous, never guessed.
5. **Don't put words in the speaker's mouth.** A whole ayah is replaced with the exact Uthmani text; a partial quotation keeps what was said and gets the reference.

## The text

The Qur'an text is the [Tanzil](https://tanzil.net) Quran Text, used verbatim under its terms.

## Status

Version 0, for transcripts in Arabic script. Transliterated Arabic, subtitle files, running speech recognition itself and an evaluation set are open tasks in [The First Hundred](/first-hundred).
