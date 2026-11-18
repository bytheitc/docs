/** The address a page is read at: the home page is /, everything else /<slug>. */
export const hrefOf = (slug: string) => (slug === "index" ? "/" : `/${slug}`);
