import { useEffect, useState } from 'react';
import { FiCheck, FiCopy, FiShare2 } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from './Modal.jsx';
import { Alert, Button, Spinner, Switch } from './ui.jsx';

const shareUrl = (shareId) => `${window.location.origin}/w/${shareId}`;

/** "Share" button + dialog: turn the public, read-only watchlist link on or
 *  off, copy it, or reset it so old links stop working. */
export default function ShareWatchlist() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState(null); // {enabled, share_id}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    setError(null);
    api
      .watchlistShare(user.id, { signal: controller.signal })
      .then(setShare)
      .catch((err) => err.code !== 'aborted' && setError(err.message));
    return () => controller.abort();
  }, [open, user.id]);

  const update = async (body) => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      setShare(await api.setWatchlistShare(user.id, body));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(share.share_id));
      setCopied(true);
    } catch {
      setError('Copy failed — select the link and copy it manually.');
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <FiShare2 className="h-4 w-4" aria-hidden="true" /> Share
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Share your watchlist">
        <div className="space-y-5 px-6 pb-6 pt-2">
          <p className="text-sm text-muted">Anyone with the link can see your watchlist and your first name — nothing else.</p>
          {error && <Alert>{error}</Alert>}
          {!share && !error && <Spinner label="Loading sharing settings" />}
          {share && (
            <>
              <Switch checked={share.enabled} disabled={busy} onChange={(enabled) => update({ enabled })} className="text-ink">
                Public link
              </Switch>
              {share.enabled && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={shareUrl(share.share_id)}
                      aria-label="Share link"
                      onFocus={(e) => e.target.select()}
                      className="h-10 min-w-0 flex-1 rounded-md border border-line/[0.12] bg-canvas px-3 text-sm text-ink"
                    />
                    <Button onClick={copy} aria-live="polite">
                      {copied ? <FiCheck className="h-4 w-4" aria-hidden="true" /> : <FiCopy className="h-4 w-4" aria-hidden="true" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <button type="button" disabled={busy} onClick={() => update({ enabled: true, rotate: true })} className="text-sm text-subtle underline-offset-4 hover:text-ink hover:underline">
                    Reset link (old links stop working)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
