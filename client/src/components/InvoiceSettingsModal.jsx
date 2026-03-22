import React, { useState, useRef } from 'react';
import { XMarkIcon, Cog6ToothIcon, BuildingOfficeIcon, SwatchIcon, CreditCardIcon, AdjustmentsHorizontalIcon, UserGroupIcon, PlusIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

const PRESET_TEMPLATES = [
  { id: 'classic', label: 'Classic', description: 'Blue business invoice with GST and totals.', header: '#2563EB', accent: '#1d4ed8' },
  { id: 'minimal', label: 'Minimal', description: 'Clean monochrome invoice for a simple look.', header: '#111827', accent: '#6B7280' },
  { id: 'bold', label: 'Bold', description: 'Dark header invoice with high-contrast totals.', header: '#1E293B', accent: '#F59E0B' },
];

const TABS = [
  { id: 'company',     label: 'Company',     Icon: BuildingOfficeIcon  },
  { id: 'templates',   label: 'Templates',   Icon: SwatchIcon          },
  { id: 'payment',     label: 'Payment',     Icon: CreditCardIcon      },
  { id: 'preferences', label: 'Preferences', Icon: AdjustmentsHorizontalIcon },
  { id: 'clients',     label: 'Clients',     Icon: UserGroupIcon       },
];

export default function InvoiceSettingsModal({ open, onClose, settings, onChange, clients, onAddClient }) {
  const [tab, setTab] = useState('company');
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '' });
  const logoInputRef = useRef();

  if (!open) return null;

  const activeTemplate = settings.templateId || 'classic';

  const handleLogoFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange({ ...settings, logoPreview: ev.target.result, logoFile: file });
    reader.readAsDataURL(file);
  };

  const handleAddClient = () => {
    if (!newClient.name.trim()) return;
    onAddClient(newClient);
    setNewClient({ name: '', email: '', phone: '', address: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Cog6ToothIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <XMarkIcon className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-2 overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── COMPANY ── */}
          {tab === 'company' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Company Name</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={settings.companyName || ''}
                  onChange={e => onChange({ ...settings, companyName: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Website</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.website || ''}
                    onChange={e => onChange({ ...settings, website: e.target.value })}
                    placeholder="www.example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.companyEmail || ''}
                    onChange={e => onChange({ ...settings, companyEmail: e.target.value })}
                    placeholder="billing@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Address</label>
                <textarea
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={settings.companyAddress || ''}
                  onChange={e => onChange({ ...settings, companyAddress: e.target.value })}
                  placeholder="Street, City, State - PIN"
                />
              </div>
              {/* Logo Upload */}
              <div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  {settings.logoPreview ? (
                    <img src={settings.logoPreview} alt="logo" className="h-16 object-contain mb-2" />
                  ) : (
                    <>
                      <CloudArrowUpIcon className="h-8 w-8 text-slate-400 mb-1" />
                      <span className="text-sm text-slate-500">Upload Logo</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TEMPLATES ── */}
          {tab === 'templates' && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">Choose the same PDF layout that will be used when the invoice is downloaded.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PRESET_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange({
                      ...settings,
                      templateId: t.id,
                      tableColor: t.header,
                      primaryColor: t.accent,
                    })}
                    className={`rounded-xl border-2 overflow-hidden transition-all text-left ${
                      activeTemplate === t.id ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-16 w-full" style={{ background: `linear-gradient(135deg, ${t.header}, ${t.accent})` }} />
                    <div className="p-3">
                      <p className="text-sm font-semibold text-slate-800">{t.label}</p>
                      <p className="mt-1 text-xs text-slate-500 leading-5">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PAYMENT ── */}
          {tab === 'payment' && (
            <div className="bg-slate-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCardIcon className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Banking Details</h3>
              </div>
              {[
                ['accountHolderName', 'ACCOUNT HOLDER NAME'],
                ['accountNumber',     'ACCOUNT NUMBER'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wider">{label}</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings[key] || ''}
                    onChange={e => onChange({ ...settings, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[['ifsc','IFS CODE'],['panNumber','PAN NUMBER']].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wider">{label}</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={settings[key] || ''}
                      onChange={e => onChange({ ...settings, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PREFERENCES ── */}
          {tab === 'preferences' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Prefix</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={settings.invoicePrefix || ''}
                  onChange={e => onChange({ ...settings, invoicePrefix: e.target.value })}
                  placeholder="INV"
                />
              </div>
              <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Background Watermark</p>
                  <p className="text-xs text-slate-500 mt-0.5">Show a faint logo behind the invoice content</p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, bgWatermark: !settings.bgWatermark })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.bgWatermark ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.bgWatermark ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          )}

          {/* ── CLIENTS ── */}
          {tab === 'clients' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Existing Clients</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {clients.length === 0 && <p className="text-xs text-slate-400">No clients yet.</p>}
                {clients.map(c => (
                  <div key={c.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                      {(c.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Add New Client</h3>
                {[['name','Name *'],['email','Email'],['phone','Phone'],['address','Address']].map(([k,l]) => (
                  <input
                    key={k}
                    placeholder={l}
                    value={newClient[k]}
                    onChange={e => setNewClient(p => ({ ...p, [k]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ))}
                <button
                  type="button"
                  onClick={handleAddClient}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" /> Add Client
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </button>
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
