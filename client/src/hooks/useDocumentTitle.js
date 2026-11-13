import { useEffect } from 'react';

const SUFFIX = 'Clinema';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : `${SUFFIX} — Movies that match your mood`;
  }, [title]);
}
