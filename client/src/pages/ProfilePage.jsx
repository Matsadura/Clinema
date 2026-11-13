import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { Avatar } from '../components/Navbar.jsx';
import { Alert, Button } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';
import TastePanel from '../components/TastePanel.jsx';
import ApiKeysPanel from '../components/ApiKeysPanel.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

/** Settings section: a label column and content, separated by hairlines. */
function Section({ title, description, children }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid gap-6 border-t border-line/[0.08] py-10 md:grid-cols-[240px_1fr] md:gap-12">
      <div>
        <h2 id={id} className="text-base font-medium text-ink">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function ProfilePage() {
  useDocumentTitle('Profile');
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: user.first_name, last_name: user.last_name });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = form.first_name !== user.first_name || form.last_name !== user.last_name;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateProfile(user.id, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
      });
      setUser(updated);
      setMessage({ tone: 'info', text: 'Saved.' });
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.deleteAccount(user.id);
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <header className="flex items-center gap-5 pb-10">
        <Avatar user={user} size="h-14 w-14 text-base" />
        <div className="min-w-0">
          <h1 className="font-display text-display-sm text-ink sm:text-display">
            {user.first_name} {user.last_name}
          </h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </header>

      <Section title="Details" description="Your name as shown in Clinema.">
        <form onSubmit={save} className="max-w-md space-y-6">
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-muted">
              First name
              <input
                className="field mt-2 h-10"
                value={form.first_name}
                required
                maxLength={128}
                autoComplete="given-name"
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </label>
            <label className="block text-sm text-muted">
              Last name
              <input
                className="field mt-2 h-10"
                value={form.last_name}
                required
                maxLength={128}
                autoComplete="family-name"
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </label>
          </div>
          <Button type="submit" variant="secondary" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </form>
      </Section>

      <Section title="Your taste" description="Learned from the films you like, dismiss and open. It shapes every list.">
        <TastePanel userId={user.id} />
      </Section>

      <Section
        title="API keys"
        description="Optional. Use your own Groq or TMDB key for your requests; empty or rejected keys fall back to Clinema’s. Keys are verified, stored encrypted and never shown again."
      >
        <ApiKeysPanel userId={user.id} />
      </Section>

      <Section title="Account" description="Permanently remove your account, library and taste profile.">
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete account
        </Button>
      </Section>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?">
        <div className="px-6 pb-6 pt-3">
          <p className="text-sm text-muted">This can&apos;t be undone.</p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={deleteAccount}>
              Delete permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
