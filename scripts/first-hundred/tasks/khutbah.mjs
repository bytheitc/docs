// bytheitc/khutbah: finding Qur'an quotations in khutbah transcripts. Paths are relative to that repo.
import { body } from "./body.mjs";

const T = (track, title, b) => ({ repo: "bytheitc/khutbah", track, title, body: body(b) });
const PY = "Run `uv run pytest` from the repo root. No network or GPU needed for the tests.";

export const KHUTBAH = [
  T("code", "Match transliterated Arabic (\"innallaha ma'as sabirin\")", {
    why: "When speech recognition runs in English mode, it writes Arabic in Latin letters, inconsistently: \"innallaha\", \"inna allaha\", \"inn allah\". Today the matcher only understands Arabic script, so these quotations are missed entirely.",
    todo: [
      "Add `khutbah/translit.py`: reduce a Latin-script word to a rough consonant skeleton (drop vowels, fold common spellings: th/dh/z, kh, gh, sh, aa/a, double letters).",
      "Reduce each Qur'an word the same way, from its Arabic letters, and index that too.",
      "Let `Matcher.find` try the transliteration index for Latin-script runs.",
    ],
    done: ["`innallaha ma'as sabirin` finds 2:153 (and 8:46)", "An English sentence with no Arabic finds nothing", PY],
    files: ["khutbah/match.py", "khutbah/quran.py"],
  }),
  T("code", "Read and write subtitles (SRT and WebVTT) with timestamps", {
    why: "Real transcripts come as captions with timestamps. A quotation needs to carry the time it was said, so a viewer can jump to it and so captions can be corrected in place.",
    todo: ["Add `khutbah/captions.py`: parse SRT and WebVTT into words with start and end times.", "Run the matcher over the words, and map each quotation back to its time range.", "Write corrected captions: the quotation's cues replaced with the exact text and reference."],
    done: ["A round trip through an SRT file keeps every cue's timing", "`python -m khutbah annotate talk.srt` writes valid SRT", PY],
    files: ["khutbah/__main__.py", "khutbah/match.py"],
  }),
  T("code", "Run Whisper on an audio file and find the quotations", {
    why: "The pipeline should start from audio, not from a transcript someone else made.",
    todo: ["Add an optional extra (`uv add --optional asr faster-whisper`) and `python -m khutbah transcribe talk.mp3 -o talk.srt`.", "Use word-level timestamps.", "Keep it optional: the core package must stay dependency-free."],
    done: ["Works on a short public-domain recording on a laptop CPU", "Tests still run without the extra installed"],
    files: ["pyproject.toml", "khutbah/__main__.py"],
  }),
  T("tests", "Build an evaluation set from real khutbahs", {
    why: "We can't say how well this works until it's measured on real recognition output, not hand-written test sentences.",
    todo: ["Collect 10 short excerpts (1 to 3 minutes) from khutbahs whose licence allows reuse, or record your own with permission.", "For each: the recognition output, and by hand, every quotation with its exact reference.", "Store them in `eval/` with a README giving each excerpt's source and licence."],
    done: ["10 excerpts, each with a hand-checked answer key", "Sources and licences listed"],
    files: ["eval/ (new)"],
  }),
  T("tests", "Measure precision and recall on the evaluation set", {
    why: "Every change to the matcher should come with a number: how many real quotations it found, and how many it invented.",
    todo: ["Add `python -m khutbah.eval eval/` that runs the matcher on each excerpt and compares with the answer key.", "Report precision, recall, and the misses and false matches by name.", "A quotation counts as found when the reference matches and the span overlaps."],
    done: ["Prints a table per excerpt and in total", "Documented in the README"],
    files: ["eval/", "khutbah/"],
  }),
  T("code", "Tell the speaker's own words apart from a quotation's start and end", {
    why: "Speakers run into and out of quotations (\"and Allah says inna...\"). The alignment sometimes takes one word too many or too few at the edges, so the replacement swallows or leaves out a word.",
    todo: ["Write tests with quotations that start and end mid-sentence, in Arabic and in English.", "Trim or extend span edges so the span starts and ends on matched words only.", "Check the evaluation set doesn't get worse."],
    done: ["Span edges are exact in the new tests", PY],
    files: ["khutbah/match.py"],
  }),
  T("code", "Use the context to choose between repeated places", {
    why: "\"Inna Allaha ma'as sabirin\" is in 2:153 and 8:46. When the speaker has just quoted 2:152, it's almost certainly 2:153. Today both are reported, which is honest but less useful than it could be.",
    todo: ["When a quotation is ambiguous, prefer the alternative nearest to the other quotations in the same transcript (same surah, nearby ayat).", "Keep the others as alternatives; never drop them.", "Mark the choice as inferred, not certain."],
    done: ["Tests for a resolved case and for one that stays ambiguous", PY],
    files: ["khutbah/match.py"],
  }),
  T("code", "Word-level mapping between the simple and Uthmani texts", {
    why: "Partial quotations keep the speaker's words because the simple text (used for matching) and the Uthmani text (used for display) don't always split into the same words, so we can't safely cut out just the quoted part of the Uthmani ayah.",
    todo: ["Build, at load time, an alignment from each simple word to the Uthmani word or words it corresponds to, ayah by ayah.", "List and test the cases where they differ (e.g. يا أيها written as one word in the Uthmani script).", "Then let `annotate` show the exact Uthmani text for a partial quotation too."],
    done: ["Every ayah aligns, or the exceptions are listed in a test", "A partial quotation of 2:255 is replaced with exactly the quoted Uthmani words", PY],
    files: ["khutbah/quran.py", "khutbah/match.py"],
  }),
  T("code", "Speed up alignment for long transcripts", {
    why: "Alignment is pure Python and runs once per seed group. On an hour-long transcript with many common phrases it slows down.",
    todo: ["Write a benchmark: a one-hour transcript (generate one by mixing English filler with 40 quotations).", "Profile it, then speed up the hot path: skip seed groups already covered by an accepted quotation, cap window sizes, or band the alignment.", "Results must be identical before and after."],
    done: ["The benchmark runs at least 3× faster", "All tests pass with identical results"],
    files: ["khutbah/match.py"],
  }),
  T("code", "Mark the Arabic that isn't Qur'an: du'a and salawat", {
    why: "Khutbahs open and close with formulas that are Arabic but not Qur'an (the khutbat al-hajah, the salawat). Recognising them helps captions and keeps them from ever being mistaken for ayat.",
    todo: ["Add a small list of common formulas with their standard text in `khutbah/data/formulas.json` (source each one).", "Match them with the same alignment, labelled as formulas, never as Qur'an.", "Show them in `annotate` with their standard text."],
    done: ["The khutbat al-hajah and the Ibrahimic salawat are recognised in a test", PY],
    files: ["khutbah/data/", "khutbah/match.py"],
  }),
  T("code", "Detect which language each stretch of speech is in", {
    why: "A khutbah switches between English and Arabic mid-sentence. Knowing where the Arabic is lets the pipeline run the matcher only there, and later lets recognition use the right language model for each stretch.",
    todo: ["Label each transcript word as Arabic script, Latin-script Arabic (transliteration) or English, using simple features first (script, common English words).", "Merge labels into stretches.", "Expose it as `khutbah.lang.segments(words)`."],
    done: ["Tests on mixed sentences", PY],
    files: ["khutbah/ (new module)"],
  }),
  T("code", "JSON output with everything a caption editor needs", {
    why: "Other tools (caption editors, archives) will consume this. `find --json` gives spans and references but not the exact text, the ambiguity reason or the partial flag in a stable shape.",
    todo: ["Define the output in `docs/output.md`: transcript spans, reference, alternatives, partial, confidence, exact Uthmani and simple text.", "Make `find --json` produce exactly that, with a `version` field."],
    done: ["The JSON matches the documented shape (a test checks it)", PY],
    files: ["khutbah/__main__.py"],
  }),
  T("design", "A transcript viewer with quotations highlighted", {
    why: "People will judge this by seeing it: a transcript where every quotation is visibly marked, with the ayah and its reference one tap away.",
    todo: ["Build a single static page (`viewer/index.html`) that loads the JSON output and a transcript.", "Mark quotations in the text; tapping one shows the Uthmani text, the reference and any alternatives.", "Right-to-left Arabic set properly (Amiri Quran or similar); works on a phone."],
    done: ["Works on the README's example", "Screenshots on desktop and phone in the PR"],
    files: ["viewer/ (new)"],
  }),
  T("code", "Hadith: find quotations of the most-cited hadith", {
    why: "After the Qur'an, khutbahs quote hadith. The same matcher can find them, starting with a small, well-known collection.",
    todo: ["Start with the 42 hadith of an-Nawawi's Forty, Arabic text from a source whose licence allows reuse (state it).", "Index and match them like the Qur'an, labelled as hadith with the collection and number.", "Never claim a grading the source doesn't give."],
    done: ["Hadith 1 (innama al-a'malu bin-niyyat) is found in a test", "The source and licence are in the README"],
    files: ["khutbah/data/", "khutbah/match.py"],
  }),
  T("tests", "Property tests: damage a quotation and check it's still found", {
    why: "The tests use a handful of hand-made errors. A property test can try thousands: take random ayat, drop or change some words, and check the matcher still finds the right place.",
    todo: ["Add `hypothesis` as a dev dependency and write a test that samples ayat with at least 6 words and applies up to 15% word drops and one-letter changes.", "Assert the true reference is the match or among its alternatives.", "Record the damage rate where it starts failing in the README."],
    done: ["The property test passes at the chosen damage rate", PY],
    files: ["tests/"],
  }),
  T("code", "Publish to PyPI with a small, stable API", {
    why: "Other projects (caption tools, archives) should be able to `pip install khutbah` and call one function.",
    todo: ["Decide and document the public API in `khutbah/__init__.py`: `Matcher`, `Quotation`, `find`, `annotate`.", "Add a GitHub Actions workflow that runs the tests and builds the package, and publishes on a tag with trusted publishing.", "Make sure the Tanzil files and notice ship inside the package."],
    done: ["`uv build` produces a wheel containing the data files and LICENSE", "The workflow passes on a pull request"],
    files: ["pyproject.toml", "khutbah/__init__.py", ".github/workflows/ (new)"],
  }),
  T("docs", "Write the contributor guide", {
    why: "Contributors come from two worlds: people who know speech recognition and people who know the Qur'an. Each needs to know what the other cares about.",
    todo: ["Write `CONTRIBUTING.md`: how to run it, how the matcher works (the five steps in the README, in more depth), the rules about the Qur'an text (never edited, always credited), and how to add a test.", "Explain why partial quotations keep the speaker's words."],
    done: ["Under about 120 lines", "A newcomer can run the tests and add one by following it"],
    files: ["CONTRIBUTING.md (new)", "README.md"],
  }),
  T("code", "Quotations recited in other riwayat (Warsh, Qalun)", {
    why: "Many speakers in North and West Africa recite in Warsh. Its wording differs from the Hafs text in places (for example ملك and مالك in al-Fatihah), so the matcher scores those quotations lower or misses them.",
    todo: ["Collect the common word-level differences between Hafs and Warsh from a published source (name it), and store them in `khutbah/data/`.", "Let the alignment treat a known variant as a match, and report which riwayah the speaker appears to be using.", "Never rewrite the speaker's riwayah into Hafs in `annotate`."],
    done: ["Al-Fatihah recited in Warsh matches with full confidence", "Tests for both riwayat"],
    files: ["khutbah/match.py", "khutbah/data/"],
  }),
  T("code", "Index an archive: which khutbahs quoted a given ayah?", {
    why: "A masjid with a hundred recorded khutbahs wants to answer \"when did we last speak about 2:255?\". The matcher finds quotations in one transcript; nothing collects them across many.",
    todo: ["Add `python -m khutbah index <folder>` that runs the matcher on every transcript and writes one JSON index: reference to the list of files and positions.", "Add `python -m khutbah where 2:255 --index index.json` to query it.", "Incremental: re-running only reprocesses changed files."],
    done: ["Tests with a folder of three transcripts", PY],
    files: ["khutbah/__main__.py", "khutbah/ (new index.py)"],
  }),
  T("code", "Tell the two khutbahs and the du'a apart", {
    why: "A Friday khutbah has a structure: the opening formula, the first khutbah, the sitting, the second khutbah, the closing du'a. Marking those sections makes transcripts and the archive far easier to navigate.",
    todo: ["Detect the opening formula (khutbat al-hajah) and the closing du'a from their standard wording (reusing the formula list, if that issue is done).", "Split the transcript at the boundary between the two khutbahs, using the second opening formula or a long pause where timestamps exist.", "Output sections in the JSON."],
    done: ["Works on three real transcripts from the evaluation set", PY],
    files: ["khutbah/ (new structure.py)"],
  }),
  T("code", "Number normalisation: ayah numbers and Arabic digits in transcripts", {
    why: "Transcripts carry things the matcher doesn't expect: ayah numbers spoken or typed (\"verse 255\", ٢٥٥), Arabic-Indic digits, and ornate brackets copied from websites (﴿ ﴾). They break up quotations and cost matches.",
    todo: ["Strip ayah markers and brackets inside quotations before matching, and keep a note of a spoken ayah number as a hint.", "Use a spoken surah or ayah name (\"Ayat al-Kursi\", \"Surat al-Mulk\") to prefer that place when a quotation is ambiguous.", "Tests for each."],
    done: ["A quotation with ﴿ ﴾ and Arabic digits matches as if they weren't there", PY],
    files: ["khutbah/quran.py", "khutbah/match.py"],
  }),
];
