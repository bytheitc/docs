// bytheitc/ijaazah: signed, offline-verifiable chains of ijazah. Paths are relative to that repo.
import { body } from "./body.mjs";

const T = (track, title, b) => ({ repo: "bytheitc/ijaazah", track, title, body: body(b) });
const GO = "Run `go test ./...` from the repo root; nothing needs a database or network.";

export const IJAAZAH = [
  T("code", "Check scope: a teacher can only grant what they hold", {
    why: "Today the verifier checks who signed, the order, and the right to pass an ijazah on, but not *what* it covers. A teacher holding an ijazah in Hafs 'an 'Asim can grant one in \"all ten qira'at\" and it verifies. This is the most important gap in the project.",
    todo: [
      "Add a `ScopeContains func(parent, child map[string]any) bool` option to the verifier in `internal/chain/verify.go` (the same way `WithNodeCheck` is done).",
      "Call it in `validEdge`: an edge is invalid when the parent's scope doesn't cover the child's, with a reason that names both.",
      "Default rule: every key in the parent's scope must be present in the child's with the same value (the child may add keys, which narrows it).",
      "Pass it through from `signed.Verify`.",
    ],
    done: ["A test where Hafs grants \"all ten qira'at\" fails with a clear reason", "A test where the child narrows the scope (adds `\"juz\": 30`) passes", GO],
    files: ["internal/chain/verify.go", "signed/bundle.go", "signed/signed_test.go"],
  }),
  T("code", "Normalise Arabic text before signing (Unicode NFC)", {
    why: "The same name or riwayah typed on two keyboards can be different bytes (e.g. a hamza as one code point or two). Then the same ijazah hashes and signs differently, and a citation can't find its parent.",
    todo: ["Normalise every string in a claim (names, scope values, place, witnesses) to Unicode NFC in `Claim.canonical()`, using `golang.org/x/text/unicode/norm`.", "Do the same for revocation reasons."],
    done: ["A test signs a claim with a decomposed Arabic name and verifies it against the composed form", GO],
    files: ["signed/signed.go"],
  }),
  T("code", "Canonical JSON (RFC 8785) for what gets signed", {
    why: "Signatures are over `json.Marshal` output, which is deterministic for our types but not a standard. Another implementation (JavaScript, Swift) needs a byte-exact spec to verify our signatures.",
    todo: ["Implement or adopt RFC 8785 (JCS) for `Claim.canonical()` and `RevocationClaim.canonical()`.", "Add the RFC's published test vectors as tests.", "Bump nothing yet; note in the README that v1 signs JCS bytes."],
    done: ["The RFC 8785 test vectors pass", "Existing tests still pass", GO],
    files: ["signed/signed.go"],
  }),
  T("code", "Move the lineage rules out of internal/ so other projects can use them", {
    why: "`signed.Result` exposes `*chain.ChainNode`, but `chain` lives under `internal/`, so code outside this module can hold a result but can't name its type.",
    todo: ["Move `internal/chain` to a public package `lineage/`.", "Update imports in `signed/`, `cmd/`, `internal/api` and `internal/postgres`.", "Keep the API identical; this is a move, not a redesign."],
    done: ["`go build ./...` and `go test ./...` pass", "No package under `internal/` is part of a public signature any more"],
    files: ["internal/chain/", "signed/bundle.go"],
  }),
  T("code", "`ijaazah qr`: write the QR code for a bundle", {
    why: "A bundle's whole point is to be scanned. Today `ijaazah encode` prints the string, and you have to make the QR code somewhere else.",
    todo: ["Add a `qr` subcommand to `cmd/ijaazah`: `ijaazah qr yusuf.bundle -out yusuf.png`.", "Use a small pure-Go QR library (e.g. `github.com/skip2/go-qrcode`) with error correction level M.", "Print the QR version used; warn above version 25 (hard to scan from paper)."],
    done: ["The PNG scans back to the same `IJ1:` string with a phone camera", "Screenshot in the PR"],
    files: ["cmd/ijaazah/main.go"],
  }),
  T("code", "`ijaazah inspect`: read a bundle without verifying it", {
    why: "When a chain breaks, the first thing you want is to see what's in the bundle: who, what, when, and what each ijazah cites.",
    todo: ["Add `ijaazah inspect <bundle or IJ1: string>`.", "Print each credential: ID, issuer → recipient (names and short key ids), type, scope, date, root/delegate flags, what it cites.", "Then each revocation."],
    done: ["Works on the bundles from the README walkthrough", "Output fits in 100 columns"],
    files: ["cmd/ijaazah/main.go"],
  }),
  T("tests", "Fuzz the bundle decoder", {
    why: "`signed.Decode` reads strings from QR codes, which means from anyone. It must never panic or hang on hostile input.",
    todo: ["Add `FuzzDecode` in `signed/` using Go's built-in fuzzing, seeded with a valid encoded bundle and some garbage.", "Run it for a few minutes locally; fix anything it finds (or open an issue for it)."],
    done: ["`go test -fuzz=FuzzDecode -fuzztime=60s ./signed` runs clean", "The seed corpus is committed under `signed/testdata/fuzz/`"],
    files: ["signed/bundle.go"],
  }),
  T("tests", "Verification must not depend on the order of a bundle", {
    why: "Two bundles with the same credentials in a different order must give the same verdict and the same break reason. Nothing tests that.",
    todo: ["Write a test that builds a three-generation bundle, shuffles `Credentials` and `Revocations` many times, and verifies each.", "Cover a valid chain and a broken one."],
    done: ["The verdict and break reason are identical for every shuffle", GO],
    files: ["signed/signed_test.go"],
  }),
  T("tests", "Test the HTTP api with a fake store", {
    why: "`internal/api/server.go` has no tests. Its routes (issue, chain, verify by public code, revoke) are the registry's whole surface.",
    todo: ["Put the store behind an interface if it isn't already, so a fake can stand in.", "Use `net/http/httptest` to cover each route's success and its main failure (not found, bad body, invariant broken)."],
    done: ["Every route has at least two tests", GO],
    files: ["internal/api/server.go", "internal/postgres/store.go"],
  }),
  T("code", "A verify page that runs in the browser (WebAssembly)", {
    why: "Most people checking an ijazah won't install a command-line tool. The same Go verifier can run in a web page, so the check still happens on their own device and nothing is sent anywhere.",
    todo: ["Add `cmd/wasm` exposing `verify(bundleString, trustedKeysJSON)` to JavaScript via `syscall/js`, returning the chain as JSON.", "Add `web/verify.html`: paste an `IJ1:` string, see the chain with a mark on each link and the break reason if any.", "Bundle a starter `anchors.json`. It can be empty for now."],
    done: ["`GOOS=js GOARCH=wasm go build` produces the module", "The page verifies the README walkthrough's bundle", "It works with the network turned off after load"],
    files: ["signed/", "web/ (new)"],
  }),
  T("code", "Scan a QR code on the verify page", {
    why: "Pasting a string is a developer's flow. A teacher's student wants to point a phone at a certificate.",
    todo: ["Builds on the WebAssembly verify page. Add a \"Scan\" button that opens the camera.", "Use the browser's `BarcodeDetector` where it exists, with a small JS fallback library where it doesn't (Safari).", "Never upload frames anywhere."],
    done: ["Scanning the QR from `ijaazah qr` shows the verified chain on an Android phone and an iPhone"],
    files: ["web/verify.html"],
  }),
  T("design", "Design the printed ijazah certificate", {
    why: "An ijazah is also a document people frame. It should carry the QR and the chain in a way that honours the tradition: the names in the sanad, in order, with the ijazah's text.",
    todo: ["Design an A4 template (HTML/CSS that prints well) with: the ijazah text, the student's and teacher's names in Arabic and Latin script, the chain as a list, the date and place, and the QR code.", "Use proper Arabic typography (Amiri or a similar naskh), right to left.", "Show where a seal or signature goes."],
    done: ["A PDF printed from the template is in the PR", "It reads correctly in grayscale"],
    files: ["web/certificate.html (new)"],
  }),
  T("code", "Witnesses who co-sign", {
    why: "Ijazahs were often granted before witnesses. `Claim.Witnesses` holds names only, which anyone could type. A witness should be able to sign too.",
    todo: ["Add `WitnessSigs []struct{Key, Name, Sig string}` to `Credential`, signing the same canonical claim with a separate domain string (`ijaazah/v1/witness`).", "Add `signed.Witness(priv, cred)` and check every witness signature in `Verify` (a bad one is a problem noted, not a broken chain).", "Add `-witness key` to `ijaazah issue`."],
    done: ["Tests for a valid witness, a forged one, and a witness signature on a different credential", GO],
    files: ["signed/signed.go", "signed/bundle.go"],
  }),
  T("code", "Key succession: replace a lost key without breaking the chain", {
    why: "People lose phones. If a teacher's key is lost, every ijazah they grant afterwards needs a new key, and verifiers must know the new key belongs to the same teacher.",
    todo: ["Write a short design in `docs/key-succession.md` first: a statement signed by the old key (if available) or by the person's own teacher, naming the new key.", "Implement it in `signed/` and teach `Verify` to accept an issuer key that succeeds the recipient key of the cited ijazah.", "Get the design reviewed in the issue before writing the code."],
    done: ["The design is agreed in the issue", "Tests cover succession signed by the old key and by the teacher, and a forged succession"],
    files: ["signed/", "docs/ (new)"],
  }),
  T("code", "A Merkle log package for the public register", {
    why: "The plan is a public, append-only register of every ijazah issued, so a backdated or invented one can't be slipped in quietly (the way Certificate Transparency works for web certificates). Its core is a Merkle tree with inclusion and consistency proofs.",
    todo: ["Add `tlog/`: append a credential ID, get its index; prove inclusion; prove the log only grew between two sizes.", "Consider building on `golang.org/x/mod/sumdb/tlog`, which Go's module checksum database uses.", "No storage or server yet: in-memory and tested."],
    done: ["Inclusion and consistency proofs verify, and tampered proofs fail", GO],
    files: ["tlog/ (new)"],
    hints: ["Read https://research.swtch.com/tlog first."],
  }),
  T("docs", "Write the transparency log design", {
    why: "Before the register is built, its rules need agreeing: who may append, how witnesses co-sign the log's state, how a verifier checks inclusion offline, and what happens to private ijazahs.",
    todo: ["Write `docs/transparency-log.md`: goals, threat model, data structure, who signs what, how a bundle carries an inclusion proof, and open questions.", "Under about two pages. Link prior art: Certificate Transparency (RFC 9162), Sigstore Rekor, Go's sumdb."],
    done: ["Reviewed in the issue by a maintainer", "Every open question is listed rather than glossed over"],
    files: ["docs/ (new)", "DESIGN.md"],
  }),
  T("code", "Historical chains by reference, so long asanid fit in a QR", {
    why: "A three-generation bundle is about 1,000 characters. Chains back to the Prophet ﷺ run 25 to 30 generations and will not fit in a QR code. The historical part doesn't change, so it can be published once and cited by hash.",
    todo: ["Design a `HistoricalChain` document: an ordered list of narrators with sources, identified by its content hash and signed by its reviewers.", "Let a root credential cite one (`Claim.Continues`), and let `Verify` accept a set of historical chains the way it accepts trusted roots.", "Write the design up in the issue first."],
    done: ["A root that continues a known historical chain verifies with the chain supplied, and reports it missing otherwise", "The bundle size doesn't grow with the historical chain's length"],
    files: ["signed/"],
  }),
  T("code", "Verify a bundle over HTTP", {
    why: "The api in `cmd/server` verifies chains stored in its own database. Registries and other apps also need to post a bundle and get a verdict.",
    todo: ["Add `POST /verify/bundle` to `internal/api` that accepts an `IJ1:` string or JSON and returns `signed.Verify`'s result as JSON.", "Trusted roots come from a config file the server is started with.", "Limit the body size to 64 KB."],
    done: ["httptest tests for a valid bundle, a broken one and an oversized body"],
    files: ["internal/api/server.go", "cmd/server/main.go"],
  }),
  T("docs", "A guide for teachers: granting your first signed ijazah", {
    why: "The people who need this most are teachers, not developers. They need to know what a key is, how to keep it safe, and what to tell a student.",
    todo: ["Write `docs/for-teachers.md` in plain language: what a signed ijazah is, making a key, keeping it safe, granting, what the student receives, what to do if a key is lost.", "No jargon; where a term is needed, explain it once."],
    done: ["Someone who has never used a terminal can follow it with help from the README", "Under about 120 lines"],
    files: ["docs/ (new)", "README.md"],
  }),
  T("design", "Show the chain as a picture", {
    why: "On the verify page and the certificate, a chain is easier to trust when you can see it: each person, the link to the next, which link holds and which breaks.",
    todo: ["Design and build a small, dependency-free SVG renderer: a vertical chain, names in Arabic and Latin script, a mark on each link, the break point highlighted.", "It should handle a diamond (an ijazah citing two teachers)."],
    done: ["Renders the README walkthrough's chain and a broken one", "Readable on a phone screen"],
    files: ["web/ (new)"],
  }),
  T("docs", "Write the bundle format as a specification", {
    why: "A bundle is meant to be verified by any app, not only this Go code. That needs a written spec another implementation can follow byte for byte: the fields, the canonical bytes that are signed, the domain strings, the IJ1 encoding and the verification rules.",
    todo: ["Write `docs/bundle-format.md` from `signed/signed.go` and `signed/bundle.go`: every field, the signing input, the content address, the IJ1 encoding, and the verification steps in order.", "Mark what is still open (canonical JSON, NFC) and link those issues."],
    done: ["Someone could write a verifier from the document alone (a maintainer reads it with that question)", "Every rule in it matches the code"],
    files: ["docs/ (new)", "signed/signed.go", "signed/bundle.go"],
  }),
  T("tests", "Test vectors that every implementation must pass", {
    why: "Once there is a JavaScript or Swift verifier, the only way to know it agrees with the Go one is a shared set of bundles with known verdicts.",
    todo: ["Add `go run ./cmd/vectors` that writes `testdata/vectors/*.json`: each a bundle string, the trusted roots, and the expected verdict and break reason.", "Cover a valid chain, an untrusted root, a tampered ancestor, a forged signature, both revocation kinds and a missing ancestor.", "Add a Go test that reads the vectors and checks them, so they can never drift from the code."],
    done: ["At least 8 vectors, generated deterministically (fixed keys and dates)", GO],
    files: ["cmd/ (new)", "testdata/ (new)", "signed/"],
  }),
  T("code", "A TypeScript verifier that agrees with the Go one", {
    why: "Mosque websites, Islamic school apps and the verify page all speak JavaScript. A small npm package that verifies bundles in the browser lets anyone check an ijazah anywhere.",
    todo: ["Builds on the test vectors issue. Start a `js/` package: decode IJ1, compute content addresses, check Ed25519 signatures with Web Crypto, and run the lineage rules.", "It must pass every vector in `testdata/vectors/`.", "No dependencies beyond the platform."],
    done: ["All vectors pass under Node and in a browser", "A README with one example"],
    files: ["js/ (new)", "testdata/vectors/"],
  }),
  T("tests", "Integration tests for the Postgres registry", {
    why: "`internal/postgres/store.go` and the database rules in `migrations/0001_init.sql` (which refuse a citation that breaks the lineage) have no tests at all.",
    todo: ["Add tests that run against a throwaway Postgres (a container in CI, or a local one), skipped when none is available.", "Cover: issuing a valid chain, the database refusing a citation of someone else's credential, a non-delegable parent, and an out-of-order date, and both revocation kinds."],
    done: ["The tests run in CI against Postgres 16", "Each database rule has a test that it refuses what it should"],
    files: ["internal/postgres/store.go", "migrations/0001_init.sql"],
  }),
];
