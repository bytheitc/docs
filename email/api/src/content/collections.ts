// This house has no content collections: "email" is registered with the CMS purely so /staff/*
// can reuse a CMS account and its space access, the same way accounts/api does for reviewing a
// partner's app. Everything this house owns (lists, contacts, templates, campaigns, sends) lives
// in EmailStore, not here.
import type { CollectionDef, SpaceLink } from "./types.js";

export const COLLECTIONS: CollectionDef[] = [];

export const FORMS: Record<string, string> = {};

export const LINKS: SpaceLink[] = [];

export function findCollection(_name: string): CollectionDef | undefined {
  return undefined;
}
