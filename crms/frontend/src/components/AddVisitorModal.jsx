import { useState } from 'react';
import { createVisitor } from '../services/api';

const TRANSACTION_TYPES = [
  'Birth Certificate',
  'Marriage Certificate',
  'Death Certificate',
  'CENOMAR (Certificate of No Marriage)',
  'Certificate of Live Birth',
  'Court Order / Annotation',
  'Late Registration',
  'Correction of Entry',
  'Other',
];

const BARANGAYS = [
  'Bacong Ibaba',
  'Bacong Ilaya',
  'Barangay 1 (Poblacion)',
  'Barangay 2 (Poblacion)',
  'Barangay 3 (Poblacion)',
  'Barangay 4 (Poblacion)',
  'Barangay 5 (Poblacion)',
  'Barangay 6 (Poblacion)',
  'Barangay 7 (Poblacion)',
  'Barangay 8 (Poblacion)',
  'Barangay 9 (Poblacion)',
  'Lavides',
  'Magsaysay',
  'Malaya',
  'Nieva',
  'Recto',
  'San Ignacio Ibaba',
  'San Ignacio Ilaya',
  'San Isidro Ibaba',
  'San Isidro Ilaya',
  'San Jose',
  'San Nicolas',
  'San Vicente',
  'Santa Maria Ibaba',
  'Santa Maria Ilaya',
  'Sumilang',
  'Villarica',
];

export default function AddVisitorModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    sex: '',
    barangay: '',
    mobile_number: '',
    transaction_type: '',
    document_owner_name: '',
    status: 'Pending',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.sex || !form.barangay || !form.mobile_number || !form.transaction_type || !form.document_owner_name) {
      setError('Please fill in all required fields.');
      return;
    }
    const mobileRegex = /^(09|\+639)\d{9}$/;
    if (!mobileRegex.test(form.mobile_number.replace(/\s/g, ''))) {
      setError('Please enter a valid Philippine mobile number (e.g. 09171234567).');
      return;
    }
    setLoading(true);
    try {
      await createVisitor(form);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add visitor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 className="modal-title">➕ Register New Client</h3>
          <button className="btn-icon" onClick={onClose} title="Close">✕</button>
        </div>

        {success ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>
              Client Registered Successfully!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <strong>{form.name}</strong> has been added to the registry.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
              Closing automatically...
            </p>
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">⚠️ {error}</div>
            )}

            <div className="form-group">
              <label className="form-label">Name of Client *</label>
              <input
                className="form-control"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Juan dela Cruz"
                autoFocus
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Sex *</label>
                <select className="form-control" name="sex" value={form.sex} onChange={handleChange}>
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input
                  className="form-control"
                  name="mobile_number"
                  value={form.mobile_number}
                  onChange={handleChange}
                  placeholder="e.g. 09171234567"
                  maxLength={13}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address (Barangay) *</label>
              <select className="form-control" name="barangay" value={form.barangay} onChange={handleChange}>
                <option value="">Select Barangay</option>
                {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Type of Transaction *</label>
              <select className="form-control" name="transaction_type" value={form.transaction_type} onChange={handleChange}>
                <option value="">Select Transaction Type</option>
                {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name of Document Owner *</label>
              <input
                className="form-control"
                name="document_owner_name"
                value={form.document_owner_name}
                onChange={handleChange}
                placeholder="Full name as it appears on the document"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                The person whose name appears on the requested document (may differ from the client).
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Status</label>
              <select className="form-control" name="status" value={form.status} onChange={handleChange}>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> Saving...</>
              ) : '✓ Register Client'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
