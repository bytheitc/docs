---
title: Ijaazah
description: "The isnad as a protocol: signed ijazahs that carry their whole chain, verifiable offline by anyone."
---

An ijazah has always been trusted because of the chain behind it: who heard the student, who heard that teacher, back to the source. Paper and PDFs can't show that chain, so they're easy to forge. A central database doesn't fix it either: then you're trusting whoever runs the database.

Ijaazah does what the isnad does. Each link is a **signature by the teacher** over the ijazah they grant, citing (by content hash) the teacher's own ijazah. A student's QR code holds the whole chain. Scan it anywhere and every link is checked, offline, without trusting any server, including ours.

**Repository:** [bytheitc/ijaazah](https://github.com/bytheitc/ijaazah) · Go

## Try it

```sh
go build -o ijaazah ./cmd/ijaazah

S=$(./ijaazah keygen -name "Sheikh Ahmad"   -out sheikh.key)
T=$(./ijaazah keygen -name "Ustadha Maryam" -out teacher.key)
Y=$(./ijaazah keygen -name "Yusuf"          -out student.key)
echo "$S  # Sheikh Ahmad" > anchors.txt   # the roots you choose to trust

SC='{"work":"Quran","riwayah":"Hafs an Asim"}'
./ijaazah issue -key sheikh.key  -to $T -to-name "Ustadha Maryam" -scope "$SC" -root -delegate -out teacher.bundle
./ijaazah issue -key teacher.key -to $Y -to-name "Yusuf" -scope "$SC" -parent teacher.bundle -out yusuf.bundle

./ijaazah encode yusuf.bundle                      # the string a QR code carries
./ijaazah verify -trust anchors.txt yusuf.bundle   # every link checked, or exactly where it breaks
```

## What it checks

- **Every link is signed** by the teacher it names (Ed25519). Edit any ijazah in the chain and it fails.
- **Every ijazah is content-addressed**, so an ancestor can't be swapped out.
- **The recipient of each ijazah is the issuer of the next**, and that ijazah permits passing it on.
- **Order**: a teacher's ijazah must predate the ones they grant under it.
- **Roots are roots only if you trust them.** You choose your anchors, the way a reader chooses which asanid they rely on.
- **Two kinds of revocation**: *prospective* (no further ijazahs from that date) and *retroactive* (never valid; everything below it falls).
- **Where it breaks, not just whether.** A missing link four generations up is a different fact from a forgery, and the verifier says which.

> [!IMPORTANT]
> The software proves who signed what. It does not, and cannot, rule on a sanad. Which chains are recorded and which roots are trusted needs qualified review.

## Status

Version 0: the signed format may still change. Canonical JSON, a public transparency log, a verify page and a QR scanner are open tasks in [The First Hundred](/first-hundred).
