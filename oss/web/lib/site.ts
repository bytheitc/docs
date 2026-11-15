// Site-wide settings for ITC Open Source. The values here seed the "Site settings" document in the admin,
// which is where they are changed; pages read them through lib/data.ts.

// TODO(launch): replace with the real GitHub organisation URL (in the admin). Every "GITHUB" / repo link reads from it.
export const GITHUB_ORG_URL = "https://github.com/bytheitc";

// Placeholder contact addresses. example.org until real inboxes exist.
export const CONTACT = {
  conduct: "conduct@example.org",
  maintainers: "maintainers@example.org",
  sprints: "sprints@example.org",
} as const;

export interface SiteSettings {
  id: string;
  githubOrgUrl: string;
  contact: { conduct: string; maintainers: string; sprints: string };
}

export const repoUrl = (githubOrgUrl: string, slug: string) => `${githubOrgUrl.replace(/\/+$/, "")}/${slug}`;

export interface NavItem {
  href: string;
  label: string;
}

export const NAV: NavItem[] = [
  { href: "/projects", label: "PROJECTS" },
  { href: "/contribute", label: "CONTRIBUTE" },
  { href: "/sprints", label: "SPRINTS" },
  { href: "/contributors", label: "CONTRIBUTORS" },
  { href: "/governance", label: "GOVERNANCE" },
  { href: "/code-of-conduct", label: "ADAB" },
];
