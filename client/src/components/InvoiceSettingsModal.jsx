import React, { useState, useRef } from 'react';
import { XMarkIcon, Cog6ToothIcon, BuildingOfficeIcon, SwatchIcon, CreditCardIcon, AdjustmentsHorizontalIcon, UserGroupIcon, PlusIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

import { businessAPI } from '../services/api';
import toast from 'react-hot-toast';

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
  const templateInputRef = useRef();

  if (!open) return null;

  const activeTemplate = settings.templateId || 'classic';

  const handleLogoFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange({ ...settings, logoPreview: ev.target.result, logoFile: file });
    reader.readAsDataURL(file);
  };
  
  const handleTemplateFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    let localPreview = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      localPreview = ev.target.result;
      onChange({ ...settings, customTemplatePreview: localPreview, templateId: 'custom' });
    };
    reader.readAsDataURL(file);

    // Upload
    const formData = new FormData();
    formData.append('template', file);
    const toastId = toast.loading('Uploading template...');
    try {
      const res = await businessAPI.uploadTemplate(formData);
      const biz = JSON.parse(localStorage.getItem('business') || '{}');
      localStorage.setItem('business', JSON.stringify({ ...biz, customTemplateUrl: res.data.customTemplateUrl }));
      
      // Update with BOTH the server URL and the local preview to avoid flickering
      onChange({ 
        ...settings, 
        customTemplateUrl: res.data.customTemplateUrl, 
        customTemplatePreview: localPreview || settings.customTemplatePreview,
        templateId: 'custom' 
      });
      toast.success('Template uploaded and applied!', { id: toastId });
    } catch (err) {
      toast.error('Failed to upload template.', { id: toastId });
    } finally {
      e.target.value = ''; // Allow re-selecting the same file
    }
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
              <p className="text-sm text-slate-500">Choose a PDF layout, then fine-tune the colors and spacing that will also be used in the downloaded invoice.</p>
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

              {/* Upload Template from Device */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Upload from Device</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Use a custom image/design as your invoice background.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => templateInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                  >
                    <CloudArrowUpIcon className="h-4 w-4" />
                    <span>{settings.customTemplateUrl ? 'Change Design' : 'Upload Template'}</span>
                  </button>
                  <input
                    ref={templateInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleTemplateFile}
                  />
                </div>
                
                {settings.customTemplatePreview && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="relative group">
                      <img
                        src={settings.customTemplatePreview}
                        alt="custom template"
                        className="h-12 w-12 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <SwatchIcon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">Your Custom Template</p>
                      <button
                        type="button"
                        onClick={() => {
                          onChange({
                            ...settings,
                            templateId: 'custom',
                            // Keep background but set it as active
                          });
                        }}
                        className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${activeTemplate === 'custom' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {activeTemplate === 'custom' ? '✓ Currently Active' : 'Apply this template'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Template customization</h3>
                  <p className="mt-1 text-xs text-slate-500">These options affect both the live preview and the downloaded PDF.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Header color</label>
                    <input
                      type="color"
                      value={settings.tableColor || '#2563eb'}
                      onChange={e => onChange({ ...settings, tableColor: e.target.value })}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Accent color</label>
                    <input
                      type="color"
                      value={settings.primaryColor || '#1d4ed8'}
                      onChange={e => onChange({ ...settings, primaryColor: e.target.value })}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Spacing</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onChange({ ...settings, compactMode: false })}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${!settings.compactMode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        Comfortable
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange({ ...settings, compactMode: true })}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${settings.compactMode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        Compact
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Table styling</label>
                    <button
                      type="button"
                      onClick={() => onChange({ ...settings, showRowDividers: settings.showRowDividers === false })}
                      className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${settings.showRowDividers !== false ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
                    >
                      {settings.showRowDividers !== false ? 'Row dividers on' : 'Row dividers off'}
                    </button>
                  </div>
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
                  <p className="text-sm font-semibold text-slate-800">Header Layout Switch</p>
                  <p className="text-xs text-slate-500 mt-0.5">Move Logo and Company details to the right side</p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, swapHeaderLayout: !settings.swapHeaderLayout })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.swapHeaderLayout ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.swapHeaderLayout ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Bill To &amp; From Position</p>
                  <p className="text-xs text-slate-500 mt-0.5">Show contacts section at the bottom of the invoice</p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, contactsAtBottom: !settings.contactsAtBottom })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.contactsAtBottom ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.contactsAtBottom ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
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
