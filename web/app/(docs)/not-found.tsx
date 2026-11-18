import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="main">
      <article className="doc">
        <p className="eyebrow">Not found</p>
        <h1>There’s no page here.</h1>
        <p className="lede">It may have moved. Search with <kbd>⌘K</kbd>, or start from the <Link href="/">home page</Link>.</p>
      </article>
    </main>
  );
}
