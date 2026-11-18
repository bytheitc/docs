import Link from "next/link";
import { CodeCopy } from "@/components/CodeCopy";
import { Toc } from "@/components/Toc";
import { hrefOf } from "@/lib/href";
import type { DocPage, Heading, PageMeta } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";

/** One page: title, text, contents, and the way to the next page. Shared by the home page. */
export function DocView({ page, headings, prev, next, hero }: { page: DocPage; headings: Heading[]; prev: PageMeta | null; next: PageMeta | null; hero?: React.ReactNode }) {
  const html = renderMarkdown(page.markdown);
  return (
    <>
      <main id="main" className="main">
        <article className="doc">
          {hero ?? (
            <header>
              {page.section && <p className="eyebrow">{page.section}</p>}
              <h1>{page.title}</h1>
              {page.description && <p className="lede">{page.description}</p>}
            </header>
          )}
          {/* renderMarkdown escapes raw HTML and unsafe links (lib/markdown.ts), so this is safe to insert. */}
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
          <CodeCopy />
          <footer className="doc-foot">
            <div className="edit-row">
              <Link href={`/admin/edit/${page.slug}`}>Edit this page</Link>
              <a href={`https://github.com/bytheitc/docs/blob/main/content/${page.slug}.md`} target="_blank" rel="noopener noreferrer">View the source</a>
              <a href={`https://github.com/bytheitc/docs/issues/new?title=${encodeURIComponent(`Docs: ${page.title}`)}`} target="_blank" rel="noopener noreferrer">Suggest a change</a>
            </div>
            {(prev || next) && (
              <nav className="pager" aria-label="Previous and next page">
                {prev && <Link href={hrefOf(prev.slug)}><small>Previous</small><b>{prev.title}</b></Link>}
                {next && <Link className="next" href={hrefOf(next.slug)}><small>Next</small><b>{next.title}</b></Link>}
              </nav>
            )}
          </footer>
        </article>
      </main>
      <Toc headings={headings} />
    </>
  );
}
