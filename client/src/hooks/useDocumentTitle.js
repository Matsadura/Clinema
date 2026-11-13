import { useEffect } from 'react';

const SUFFIX = 'Clinema';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : `${SUFFIX} — Your mood & weather movie match`;
  }, [title]);
}
