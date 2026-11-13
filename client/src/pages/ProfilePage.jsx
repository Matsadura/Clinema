import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { Avatar } from '../components/Navbar.jsx';
import { Alert, Button } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';
import TastePanel from '../components/TastePanel.jsx';
import ApiKeysPanel from '../components/ApiKeysPanel.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const inputClass =
  'mt-1 block w-full rounded-xl border border-white/10 bg-secondary-darker px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40';

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
      setMessage({ tone: 'info', text: 'Profile updated.' });
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
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar user={user} size="h-16 w-16 text-xl" />
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            {user.first_name} {user.last_name}
          </h1>
          <p className="text-sm text-white/60">{user.email}</p>
        </div>
      </div>

      <form onSubmit={save} className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-bold">Personal details</h2>
        {message && (
          <Alert tone={message.tone} className="mt-4">
            {message.text}
          </Alert>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            First name
            <input
              className={inputClass}
              value={form.first_name}
              required
              maxLength={128}
              autoComplete="given-name"
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </label>
          <label className="block text-sm font-medium">
            Last name
            <input
              className={inputClass}
              value={form.last_name}
              required
              maxLength={128}
              autoComplete="family-name"
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Email
          <input className={`${inputClass} cursor-not-allowed opacity-60`} value={user.email || ''} disabled readOnly />
        </label>
        <div className="mt-6 flex justify-end">
          <Button type="submit" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>

      <TastePanel userId={user.id} />

      <ApiKeysPanel userId={user.id} />

      <section className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="text-lg font-bold">Delete account</h2>
        <p className="mt-1 text-sm text-white/60">This permanently removes your account and your liked and saved films.</p>
        <Button variant="danger" className="mt-4" onClick={() => setConfirmDelete(true)}>
          Delete my account
        </Button>
      </section>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?" size="sm">
        <div className="p-6 pt-3">
          <p className="text-sm text-white/70">This can&apos;t be undone.</p>
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
