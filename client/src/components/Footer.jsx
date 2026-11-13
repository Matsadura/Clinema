export const REPO_URL = 'https://github.com/Matsadura/Clinema';

/** One quiet line: attribution TMDB requires, and the source link.
 *  Navigation lives only in the header. */
export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line/[0.08]">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          &copy; {new Date().getFullYear()} Clinema. Film data from{' '}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-muted underline-offset-4 hover:text-ink hover:underline">
            TMDB
          </a>
          ; not endorsed or certified by TMDB.
        </p>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-muted underline-offset-4 hover:text-ink hover:underline">
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
