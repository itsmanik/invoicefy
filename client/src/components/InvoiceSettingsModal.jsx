import React, { useState, useRef } from 'react';
import { XMarkIcon, Cog6ToothIcon, BuildingOfficeIcon, SwatchIcon, CreditCardIcon, AdjustmentsHorizontalIcon, UserGroupIcon, PlusIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

const PRESET_TEMPLATES = [
  { id: 'classic-blue',  label: 'Classic Blue',   color: '#0e4272', header: '#0e4272', accent: '#3b82f6' },
  { id: 'classic-red',   label: 'Classic Red',    color: '#7b1616', header: '#7b1616', accent: '#ef4444' },
  { id: 'classic-green', label: 'Classic Green',  color: '#0d3d2b', header: '#0d3d2b', accent: '#10b981' },
  { id: 'royal-purple',  label: 'Royal Purple',   color: '#4c1d95', header: '#4c1d95', accent: '#8b5cf6' },
  { id: 'slate-gold',    label: 'Slate Gold',     color: '#334155', header: '#334155', accent: '#eab308' },
  { id: 'midnight',      label: 'Midnight',       color: '#020617', header: '#020617', accent: '#6366f1' },
  { id: 'minimalist',    label: 'Minimalist',     color: '#111111', header: '#111111', accent: '#64748b' },
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
  const [customTheme, setCustomTheme] = useState({ id: 'custom', label: 'My Custom Theme', color: '#4285f4' });
  const [showCustom, setShowCustom] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '' });
  const logoInputRef = useRef();

  if (!open) return null;

  const activeTemplate = settings.templateId || 'classic-blue';
  const allTemplates = [...PRESET_TEMPLATES, ...(showCustom ? [customTheme] : [])];

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
              <div className="grid grid-cols-3 gap-3">
                {allTemplates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange({ 
                      ...settings, 
                      templateId: t.id, 
                      templateColor: t.color,
                      tableColor: t.header,
                      primaryColor: t.accent
                    })}
                    className={`rounded-xl border-2 overflow-hidden transition-all text-left ${
                      activeTemplate === t.id ? 'border-blue-500 shadow-md' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-14 w-full" style={{ background: t.color }} />
                    <p className="text-xs font-semibold text-slate-700 text-center py-2 px-1">{t.label}</p>
                  </button>
                ))}
                {/* + Custom */}
                {!showCustom && (
                  <button
                    type="button"
                    onClick={() => { setShowCustom(true); onChange({ ...settings, templateId: 'custom', templateColor: customTheme.color }); }}
                    className="rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 py-3 hover:border-blue-400 text-slate-400 hover:text-blue-500 transition-all"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span className="text-xs font-medium">Custom</span>
                  </button>
                )}
              </div>

              {/* Customize panel */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <AdjustmentsHorizontalIcon className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Customize Active Template</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Table Color</label>
                    <input
                      type="color"
                      value={settings.tableColor || '#0e4272'}
                      onChange={e => onChange({ ...settings, tableColor: e.target.value })}
                      className="h-10 w-full rounded-lg border border-slate-200 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Primary Color</label>
                    <input
                      type="color"
                      value={settings.primaryColor || '#4285f4'}
                      onChange={e => {
                        const updated = { ...settings, primaryColor: e.target.value };
                        if (activeTemplate === 'custom') {
                          setCustomTheme(p => ({ ...p, color: e.target.value }));
                          updated.templateColor = e.target.value;
                        }
                        onChange(updated);
                      }}
                      className="h-10 w-full rounded-lg border border-slate-200 cursor-pointer"
                    />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Layout Adjustments</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['logoX','Logo X (mm)'],['logoY','Logo Y (mm)'],['marginT','Margin T (mm)'],['marginB','Margin B (mm)']].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-500 mb-1">{label}</label>
                      <input
                        type="number"
                        value={settings[key] || 0}
                        onChange={e => onChange({ ...settings, [key]: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
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
