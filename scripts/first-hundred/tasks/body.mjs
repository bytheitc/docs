// The shape every First Hundred issue body takes: why it matters, what to do, how we'll know
// it's done, where to look. Ends with how to claim it.
export const body = ({ why, todo, done, files = [], hints = [] }) => [
  why,
  "",
  "### What to do",
  ...todo.map((t, i) => `${i + 1}. ${t}`),
  "",
  "### Done when",
  ...done.map((d) => `- [ ] ${d}`),
  ...(files.length ? ["", "### Where", ...files.map((f) => `- \`${f}\``)] : []),
  ...(hints.length ? ["", "### Hints", ...hints.map((h) => `- ${h}`)] : []),
  "",
  "---",
  "Part of **The First Hundred**. Claim it from https://bytheitc.xyz/first-hundred (sign in with GitHub) before you start, so nobody else does the same work. Write `Fixes #<this issue>` in your pull request. Stuck? Ask here.",
].join("\n");
