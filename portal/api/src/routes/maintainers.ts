// The maintainer path. Every rule here comes from the Open Source governance page, and this api
// refuses anything that page does not allow — there is no application form, and nothing is scored.
//
//   GET    /maintainers/me                      what I hold, and what is waiting on me
//   GET    /maintainers/repos/:owner/:name      who maintains a repo, and its nominations
//   POST   /maintainers/invitations             invite someone to review (maintainers of that repo)
//   POST   /maintainers/invitations/:id/respond accept or decline (the person invited)
//   POST   /maintainers/invitations/:id/withdraw
//   POST   /maintainers/nominations             nominate for work done (maintainers of that repo)
//   POST   /maintainers/nominations/:id/object  object inside the seven days
//   POST   /maintainers/nominations/:id/withdraw
//   GET    /maintainers/claims                  claims on repos I maintain
//   POST   /maintainers/claims/:id/release
//   POST   /maintainers/step-down               leave a repo
//   POST   /maintainers/:id/remove              steering group only, for conduct
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { HttpError, badRequest, body, notFound, str } from "../http.js";
import { needsContributor, needsDatabase } from "../portal/guard.js";
import {
  ANY_REPO, closesAfter, isRepo, isSteering, maintains,
  type Maintainership, type Nomination, type ReviewerInvitation,
} from "../portal/maintainers.js";
import { requirePortalStore } from "../portal/store.js";
import { claimComments, decideRequest } from "../portal/claims.js";
import { getSettings } from "../portal/content.js";
import { assignGithubIssue, commentGithubIssue } from "../providers/github.js";
import { httpUrl } from "../portal/util.js";
import type { Ctx } from "../app.js";

const MAX_REASON = 2000;
const MAX_NOTE = 1000;
const MIN_REASON = 20;

export function maintainerRoutes({ cms }: Ctx): Router {
  const r = Router();
  r.use("/maintainers", needsDatabase, needsContributor());

  const mine = (contributorId: string) => requirePortalStore().listMaintainerships({ contributorId });

  /** Throws unless this contributor may act as a maintainer of `repo`. */
  async function requireMaintainerOf(contributorId: string, repo: string): Promise<Maintainership[]> {
    const held = await mine(contributorId);
    if (!maintains(held, repo)) throw new HttpError(403, "forbidden", `Only a maintainer of ${repo} can do that.`);
    return held;
  }

  const repoOf = (req: { params: Record<string, string> }) => `${req.params.owner}/${req.params.name}`;

  /** Handles for the contributors named in these rows, so the web shows people and not ids. */
  async function handles(ids: string[]): Promise<Record<string, { handle: string; displayName: string }>> {
    const store = requirePortalStore();
    const found = await Promise.all([...new Set(ids.filter(Boolean))].map((id) => store.getContributor(id)));
    const out: Record<string, { handle: string; displayName: string }> = {};
    for (const c of found) if (c) out[c.id] = { handle: c.handle, displayName: c.displayName };
    return out;
  }

  /* ---------------- what I hold ---------------- */

  r.get("/maintainers/me", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const held = await mine(me.id);
    const repos = held.filter((m) => m.role === "maintainer").map((m) => m.repo);

    const [invitations, aboutMe, onMyRepos] = await Promise.all([
      store.listInvitations({ contributorId: me.id, status: "open" }),
      store.listNominations({ candidateId: me.id }),
      Promise.all(repos.map((repo) => store.listNominations({ repo, status: "open" }))).then((x) => x.flat()),
    ]);

    // Your own nomination, and one about you, are not yours to object to.
    const toConsider = onMyRepos.filter((n) => n.nominatedBy !== me.id && n.candidateId !== me.id);
    res.json({
      maintainerships: held,
      steering: isSteering(held),
      invitations,
      nominationsAboutMe: aboutMe,
      nominationsToConsider: toConsider,
      people: await handles([
        ...held.map((m) => m.by ?? ""),
        ...invitations.map((i) => i.invitedBy),
        ...aboutMe.map((n) => n.nominatedBy),
        ...toConsider.flatMap((n) => [n.candidateId, n.nominatedBy]),
      ]),
    });
  });

  /* ---------------- one repo, in the open ---------------- */

  r.get("/maintainers/repos/:owner/:name", async (req, res) => {
    const repo = repoOf(req);
    if (!isRepo(repo)) throw badRequest("That isn't a repository name.");
    const store = requirePortalStore();
    const [rows, nominations] = await Promise.all([
      store.listMaintainerships({ repo, includeEnded: true }),
      store.listNominations({ repo }),
    ]);
    res.json({
      repo,
      maintainers: rows.filter((m) => !m.endedAt),
      past: rows.filter((m) => m.endedAt),
      nominations,
      people: await handles([...rows.map((m) => m.contributorId), ...nominations.flatMap((n) => [n.candidateId, n.nominatedBy])]),
    });
  });

  /* ---------------- step one: an invitation to review ---------------- */

  r.post("/maintainers/invitations", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const b = body(req);
    const repo = str(b, "repo", { required: true, max: 201 });
    if (!isRepo(repo)) throw badRequest("That isn't a repository name.", { repo: "Use owner/name." });
    await requireMaintainerOf(me.id, repo);

    const handle = str(b, "handle", { required: true, max: 40 }).toLowerCase();
    const person = await store.getContributorByHandle(handle);
    if (!person) throw notFound(`Nobody here has the handle "${handle}".`);
    if (person.id === me.id) throw badRequest("You can't invite yourself.");

    const already = await store.listMaintainerships({ contributorId: person.id, repo });
    if (already.some((m) => m.role === "reviewer" || m.role === "maintainer")) {
      throw new HttpError(409, "forbidden", `${person.handle} already reviews or maintains ${repo}.`);
    }
    if ((await store.listInvitations({ contributorId: person.id, repo, status: "open" })).length) {
      throw new HttpError(409, "forbidden", `${person.handle} already has an open invitation for ${repo}.`);
    }

    const invitation: ReviewerInvitation = {
      id: randomUUID(), repo, provider: str(b, "provider", { max: 40 }) || "github",
      contributorId: person.id, invitedBy: me.id, note: str(b, "note", { max: MAX_NOTE }),
      createdAt: new Date(), status: "open",
    };
    await store.addInvitation(invitation);
    await store.addAudit({ at: new Date(), actor: me.handle, action: "maintainers.invite", target: repo, detail: person.handle });
    res.status(201).json({ ok: true, invitation });
  });

  r.post("/maintainers/invitations/:id/respond", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const invitation = await store.getInvitation(String(req.params.id));
    if (!invitation || invitation.contributorId !== me.id) throw notFound("That invitation isn't yours.");
    if (invitation.status !== "open") throw badRequest("That invitation has already been answered.");

    const accept = body(req).accept === true;
    await store.updateInvitation(invitation.id, { status: accept ? "accepted" : "declined", respondedAt: new Date() });
    if (accept) {
      await store.addMaintainership({
        id: randomUUID(), contributorId: me.id, repo: invitation.repo, provider: invitation.provider,
        role: "reviewer", since: new Date(), by: invitation.invitedBy,
      });
    }
    await store.addAudit({ at: new Date(), actor: me.handle, action: `maintainers.invite.${accept ? "accept" : "decline"}`, target: invitation.repo });
    res.json({ ok: true, accepted: accept });
  });

  r.post("/maintainers/invitations/:id/withdraw", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const invitation = await store.getInvitation(String(req.params.id));
    if (!invitation) throw notFound("No such invitation.");
    if (invitation.invitedBy !== me.id) throw new HttpError(403, "forbidden", "Only the maintainer who sent it can withdraw it.");
    if (invitation.status !== "open") throw badRequest("That invitation has already been answered.");
    await store.updateInvitation(invitation.id, { status: "withdrawn", respondedAt: new Date() });
    res.json({ ok: true });
  });

  /* ---------------- steps two and three: nomination, then silence ---------------- */

  r.post("/maintainers/nominations", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const b = body(req);
    const repo = str(b, "repo", { required: true, max: 201 });
    if (!isRepo(repo)) throw badRequest("That isn't a repository name.", { repo: "Use owner/name." });
    await requireMaintainerOf(me.id, repo);

    const handle = str(b, "handle", { required: true, max: 40 }).toLowerCase();
    const person = await store.getContributorByHandle(handle);
    if (!person) throw notFound(`Nobody here has the handle "${handle}".`);
    if (person.id === me.id) throw badRequest("You can't nominate yourself. Someone else has to have seen the work.");

    // Governance requires the nomination to be made in a public issue, linking to the work.
    const issueUrl = httpUrl(str(b, "issueUrl", { required: true, max: 500 }));
    if (!issueUrl) throw badRequest("Link the public issue where you made the nomination.", { issueUrl: "Use a full https:// link." });
    const reason = str(b, "reason", { required: true, max: MAX_REASON });
    if (reason.length < MIN_REASON) throw badRequest("Say what work this is for.", { reason: "A sentence or two, at least." });

    const held = await store.listMaintainerships({ contributorId: person.id, repo });
    if (held.some((m) => m.role === "maintainer")) throw new HttpError(409, "forbidden", `${person.handle} already maintains ${repo}.`);
    if ((await store.listNominations({ repo, candidateId: person.id, status: "open" })).length) {
      throw new HttpError(409, "forbidden", `${person.handle} is already nominated for ${repo}.`);
    }

    const openedAt = new Date();
    const nomination: Nomination = {
      id: randomUUID(), repo, provider: str(b, "provider", { max: 40 }) || "github",
      candidateId: person.id, nominatedBy: me.id, issueUrl, reason,
      openedAt, closesAt: closesAfter(openedAt), status: "open", objections: [],
    };
    await store.addNomination(nomination);
    await store.addAudit({ at: openedAt, actor: me.handle, action: "maintainers.nominate", target: repo, detail: person.handle });
    res.status(201).json({ ok: true, nomination });
  });

  r.post("/maintainers/nominations/:id/object", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const nomination = await store.getNomination(String(req.params.id));
    if (!nomination) throw notFound("No such nomination.");
    if (nomination.status !== "open") throw badRequest("That nomination is already settled.");
    if (new Date(nomination.closesAt) <= new Date()) throw badRequest("The seven days have passed, so this nomination has carried.");
    if (nomination.candidateId === me.id) throw badRequest("You can't object to your own nomination.");
    await requireMaintainerOf(me.id, nomination.repo);

    // An objection is answered in the open, in the issue. Here it only stops the clock.
    const note = str(body(req), "note", { required: true, max: MAX_NOTE });
    await store.updateNomination(nomination.id, {
      status: "objected",
      objections: [...nomination.objections, { by: me.id, at: new Date(), note }],
      decidedAt: new Date(),
    });
    await store.addAudit({ at: new Date(), actor: me.handle, action: "maintainers.object", target: nomination.repo, detail: note.slice(0, 200) });
    res.json({ ok: true });
  });

  r.post("/maintainers/nominations/:id/withdraw", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const nomination = await store.getNomination(String(req.params.id));
    if (!nomination) throw notFound("No such nomination.");
    if (nomination.nominatedBy !== me.id) throw new HttpError(403, "forbidden", "Only the maintainer who made it can withdraw it.");
    if (nomination.status !== "open") throw badRequest("That nomination is already settled.");
    await store.updateNomination(nomination.id, { status: "withdrawn", decidedAt: new Date() });
    res.json({ ok: true });
  });

  /* ---------------- triage on repos I maintain ---------------- */

  r.get("/maintainers/claims", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const held = await mine(me.id);
    const repos = new Set(held.filter((m) => m.role === "maintainer").map((m) => m.repo));
    const steering = isSteering(held);
    const claims = (await store.listClaims()).filter((c) => steering || repos.has(c.repo));
    res.json({ claims, people: await handles(claims.map((c) => c.contributorId)) });
  });

  r.post("/maintainers/claims/:id/release", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const claim = (await store.listClaims()).find((c) => c.id === String(req.params.id) && c.status === "active");
    if (!claim) throw notFound("No active claim with that id.");
    await requireMaintainerOf(me.id, claim.repo);
    const released = await store.releaseClaim(claim.id, me.handle);
    await store.addAudit({
      at: new Date(), actor: me.handle, action: "maintainers.claim.release",
      target: `claim/${claim.provider}:${claim.repo}#${claim.issue}`, detail: claim.username,
    });
    res.json({ ok: true, claim: released });
  });

  // Approving or declining a newcomer's request (portal/claims.ts). The GitHub comment and the
  // assignment follow the decision; neither failing undoes it.
  for (const decision of ["approve", "decline"] as const) {
    r.post(`/maintainers/claims/:id/${decision}`, async (req, res) => {
      const me = req.contributor!;
      const store = requirePortalStore();
      const pending = (await store.listClaims({ status: "requested" })).find((c) => c.id === String(req.params.id));
      if (!pending) throw notFound("No request waiting with that id.");
      await requireMaintainerOf(me.id, pending.repo);
      const { claimDays } = await getSettings(cms);
      const result = await decideRequest(store, me, pending.id, decision, claimDays);
      if (!result.ok) throw badRequest("That request has already been answered.");
      const claim = result.claim;
      const env = process.env as Record<string, string | undefined>;
      if (claim.provider === "github") {
        if (decision === "approve") {
          const assigned = await assignGithubIssue(fetch, env, claim.repo, claim.issue, claim.username).catch(() => false);
          if (assigned) await store.markClaimAssigned(claim.id);
        }
        const text = decision === "approve"
          ? claimComments.approved(claim.username, claim.expiresAt.toISOString().slice(0, 10), me.handle)
          : claimComments.declined(claim.username, me.handle);
        await commentGithubIssue(fetch, env, claim.repo, claim.issue, text)
          .catch((e) => console.error(`[portal] could not comment on ${claim.repo}#${claim.issue}: ${(e as Error).message}`));
      }
      res.json({ ok: true, claim });
    });
  }

  /* ---------------- leaving, and being removed ---------------- */

  r.post("/maintainers/step-down", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    const repo = str(body(req), "repo", { required: true, max: 201 });
    const row = (await store.listMaintainerships({ contributorId: me.id, repo }))
      .find((m) => m.role === "maintainer" || m.role === "reviewer");
    if (!row) throw notFound(`You don't hold anything on ${repo}.`);
    await store.endMaintainership(row.id, { endedAt: new Date(), endedReason: "stepped-down" });
    await store.addAudit({ at: new Date(), actor: me.handle, action: "maintainers.step-down", target: repo });
    res.json({ ok: true });
  });

  // "Maintainer rights can also be removed by the steering group for breaches of the code of conduct."
  r.post("/maintainers/:id/remove", async (req, res) => {
    const me = req.contributor!;
    const store = requirePortalStore();
    if (!isSteering(await mine(me.id))) throw new HttpError(403, "forbidden", "Only the steering group can remove maintainer rights.");

    const row = await store.getMaintainership(String(req.params.id));
    if (!row || row.endedAt) throw notFound("No maintainership with that id.");
    if (row.repo === ANY_REPO && row.role === "steering") {
      throw badRequest("A steering seat isn't removed here. Portal staff change those.");
    }
    const note = str(body(req), "note", { required: true, max: MAX_NOTE });
    await store.endMaintainership(row.id, { endedAt: new Date(), endedReason: "removed", endedNote: note });
    const who = await store.getContributor(row.contributorId);
    await store.addAudit({
      at: new Date(), actor: me.handle, action: "maintainers.remove",
      target: row.repo, detail: `${who?.handle ?? row.contributorId}: ${note.slice(0, 200)}`,
    });
    res.json({ ok: true });
  });

  return r;
}
