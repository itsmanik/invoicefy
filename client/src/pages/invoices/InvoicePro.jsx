import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { invoicesAPI, clientsAPI, getAssetUrl } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import InvoiceSettingsModal from '../../components/InvoiceSettingsModal';
import InvoiceLivePreview from '../../components/InvoiceLivePreview';
import {
  Cog6ToothIcon, PlusIcon, TrashIcon, EyeIcon,
  ArrowLeftIcon, DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS = {
  companyName: '', website: '', companyEmail: '', companyAddress: '', logoPreview: null, logoUrl: null,
  templateId: 'classic', tableColor: '#2563eb', primaryColor: '#1d4ed8',
  compactMode: false, showRowDividers: true,
  logoX: 0, logoY: 0, marginT: 0, marginB: 0,
  accountHolderName: '', accountNumber: '', ifsc: '', panNumber: '',
  invoicePrefix: 'INV', bgWatermark: false, swapHeaderLayout: false,
};

const WATERMARK_PRESETS = ['', 'DRAFT', 'PAID', 'CONFIDENTIAL', 'SAMPLE', 'VOID'];

const InvoicePro = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading,    setLoading]    = useState(true);
  const [clients,    setClients]    = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewMode,  setPreviewMode]  = useState(false);

  // Settings (Company, Template, Payment, Prefs)
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('invoicePro_settings') || '{}') }; }
    catch { return DEFAULT_SETTINGS; }
  });

  // Form state
  const [form, setForm] = useState({
    documentType: 'invoice',
    clientId: '', invoiceDate: new Date().toISOString().split('T')[0],
    yourGST: '', clientGST: '',
    items: [{ description: '', hsn: '', quantity: 1, unitPrice: '' }],
    tax: 0, discount: 0,
    watermark: '',
    disclaimer: 'Payment expected within 45 days from invoice date.',
  });

  useEffect(() => { fetchAll(); }, []);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('invoicePro_settings', JSON.stringify(settings));
  }, [settings]);

  const fetchAll = async () => {
    try {
      const res = await clientsAPI.getAll();
      const cl  = res.data?.clients || [];
      setClients(cl);
      // Pre-fill company from business profile
      const biz = JSON.parse(localStorage.getItem('business') || '{}');
      const businessLogoUrl = typeof biz.logoUrl === 'string' && biz.logoUrl.startsWith('/uploads/')
        ? biz.logoUrl
        : null;
      const businessLogoPreview = biz.logoAssetUrl || getAssetUrl(businessLogoUrl) || null;

      const customTemplateUrl = typeof biz.customTemplateUrl === 'string' && biz.customTemplateUrl.startsWith('/uploads/')
        ? biz.customTemplateUrl
        : null;
      const customTemplatePreview = biz.customTemplateAssetUrl || getAssetUrl(customTemplateUrl) || null;

      setSettings(prev => ({
        ...prev,
        companyName: prev.companyName || biz.name || '',
        companyEmail: prev.companyEmail || biz.email || '',
        companyAddress: prev.companyAddress || biz.address || '',
        logoUrl: businessLogoUrl,
        logoPreview: prev.logoUrl === businessLogoUrl ? (prev.logoPreview || businessLogoPreview) : businessLogoPreview,
        customTemplateUrl: prev.customTemplateUrl || customTemplateUrl,
        customTemplatePreview: prev.customTemplateUrl === customTemplateUrl ? (prev.customTemplatePreview || customTemplatePreview) : customTemplatePreview,
      }));
      
      if (id) {
        const invRes = await invoicesAPI.getById(id);
        const inv = invRes.data?.invoice || invRes.data;
        if (inv) {
          setForm(f => ({
            ...f,
            documentType: inv.documentType || 'invoice',
            clientId: inv.clientId || '',
            invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : (inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : f.invoiceDate),
            yourGST: inv.yourGST || '',
            clientGST: inv.clientGST || '',
            items: inv.items && inv.items.length ? inv.items : [{ description: '', hsn: '', quantity: 1, unitPrice: '' }],
            tax: inv.tax || 0,
            discount: inv.discount || 0,
            watermark: inv.watermark || '',
            disclaimer: inv.disclaimer || 'Payment expected within 45 days from invoice date.',
          }));

          const s = inv.templateSettings || {};
          const bd = inv.bankDetails || {};
          
          setSettings(prev => ({
            ...prev,
            templateId: inv.template || 'classic',
            companyName: s.companyName || prev.companyName,
            companyEmail: s.companyEmail || prev.companyEmail,
            companyAddress: s.companyAddress || prev.companyAddress,
            tableColor: s.headerColor || prev.tableColor,
            primaryColor: s.accentColor || prev.primaryColor,
            compactMode: s.compactMode || false,
            showRowDividers: s.showRowDividers ?? true,
            logoUrl: s.logoUrl || prev.logoUrl,
            logoPreview: s.logoUrl ? getAssetUrl(s.logoUrl) : prev.logoPreview,
            customTemplateUrl: s.customTemplateUrl || prev.customTemplateUrl,
            customTemplatePreview: s.customTemplateUrl ? getAssetUrl(s.customTemplateUrl) : prev.customTemplatePreview,
            bgWatermark: s.bgWatermark || false,
            swapHeaderLayout: s.swapHeaderLayout || false,
            invoicePrefix: s.invoicePrefix || 'INV',
            
            accountHolderName: bd.accountName || '',
            accountNumber: bd.accountNumber || '',
            ifsc: bd.ifsc || '',
            panNumber: bd.panNumber || '',
            upiId: bd.upiId || ''
          }));
        }
      } else {
        if (biz.gstNumber) setForm(f => ({ ...f, yourGST: biz.gstNumber }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (newClient) => {
    try {
      const res = await clientsAPI.create(newClient);
      const created = res.data?.client || res.data;
      setClients(prev => [...prev, created]);
      toast.success('Client added!');
    } catch {
      toast.error('Failed to add client.');
    }
  };

  const setFormField = useCallback((key, value) => setForm(f => ({ ...f, [key]: value })), []);

  const handleItemChange = (index, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[index] = { ...items[index], [field]: value };
      return { ...f, items };
    });
  };

  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { description: '', hsn: '', quantity: 1, unitPrice: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, idx) => idx !== i) : f.items }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId) return toast.error('Please select a client');
    const validItems = form.items.filter(i => i.description.trim() && parseFloat(i.quantity) > 0);
    if (!validItems.length) return toast.error('Add at least one valid item');
    try {
      setSubmitting(true);
      const payload = {
        clientId:   form.clientId,
        items:      validItems,
        tax:        parseFloat(form.tax)      || 0,
        discount:   parseFloat(form.discount) || 0,
        invoiceDate: form.invoiceDate,
        yourGST:    form.yourGST,
        clientGST:  form.clientGST,
        disclaimer: form.disclaimer,
        bankDetails: {
          accountName:   settings.accountHolderName,
          accountNumber: settings.accountNumber,
          ifsc:          settings.ifsc,
          panNumber:     settings.panNumber,
          upiId:         settings.upiId,
        },
        documentType: form.documentType,
        template: settings.templateId,
        watermark: form.watermark,
        templateSettings: {
          companyName: settings.companyName,
          companyEmail: settings.companyEmail,
          companyAddress: settings.companyAddress,
          headerColor: settings.tableColor,
          accentColor: settings.primaryColor,
          compactMode: settings.compactMode,
          showRowDividers: settings.showRowDividers,
          logoUrl: settings.logoUrl,
          customTemplateUrl: settings.customTemplateUrl,
          contactsAtBottom: settings.contactsAtBottom,
          swapHeaderLayout: settings.swapHeaderLayout,
        },
      };

      if (id) {
        await invoicesAPI.update(id, payload);
        toast.success(`${form.documentType === 'quotation' ? 'Quotation' : 'Invoice'} updated!`);
      } else {
        await invoicesAPI.create(payload);
        toast.success(`${form.documentType === 'quotation' ? 'Quotation' : 'Invoice'} created!`);
      }
      navigate('/invoices');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save document');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.quantity)||0)*(parseFloat(i.unitPrice)||0), 0);
  const discAmt  = subtotal * (parseFloat(form.discount)||0) / 100;
  const taxAmt   = (subtotal - discAmt) * (parseFloat(form.tax)||0) / 100;
  const total    = (subtotal - discAmt) + taxAmt;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/invoices" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <h1 className="text-lg font-extrabold text-slate-900">New {form.documentType === 'quotation' ? 'Quotation' : 'Invoice'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                previewMode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <EyeIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{previewMode ? 'Hide Preview' : 'Live Preview'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              form="invoice-form"
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-md"
            >
              <DocumentArrowUpIcon className="h-4 w-4" />
              {submitting ? 'Saving…' : `Generate ${form.documentType === 'quotation' ? 'Quotation' : 'Invoice'}`}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className={`flex gap-6 ${previewMode ? 'flex-col lg:flex-row' : ''}`}>

          {/* ── Form Panel ── */}
          <div className={`${previewMode ? 'lg:w-1/2' : 'w-full max-w-3xl mx-auto'} space-y-5`}>
            <form id="invoice-form" onSubmit={handleSubmit} className="space-y-5">

              {/* Section: Client & Date */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Document Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Document Type *</label>
                    <select
                      value={form.documentType}
                      onChange={e => setFormField('documentType', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    >
                      <option value="invoice">Invoice</option>
                      <option value="quotation">Quotation</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client *</label>
                    {clients.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                        No clients found.{' '}
                        <button type="button" onClick={() => setSettingsOpen(true)} className="underline font-semibold">Add one in Settings → Clients</button>
                      </div>
                    ) : (
                      <select
                        required
                        value={form.clientId}
                        onChange={e => {
                          const c = clients.find(cl => String(cl.id) === e.target.value);
                          setFormField('clientId', e.target.value);
                          setFormField('clientGST', c?.gstNumber || '');
                        }}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      >
                        <option value="">Select a client…</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{form.documentType === 'quotation' ? 'Quotation Date' : 'Invoice Date'} *</label>
                    <input
                      type="date" required
                      value={form.invoiceDate}
                      onChange={e => setFormField('invoiceDate', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Document Number</label>
                    <input
                      disabled value={`${form.documentType === 'quotation' ? 'QUO' : (settings.invoicePrefix || 'INV')}-[next serial]`}
                      className="w-full border border-slate-100 rounded-xl px-4 py-3 text-sm bg-slate-100 text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your GST</label>
                    <input
                      value={form.yourGST}
                      onChange={e => setFormField('yourGST', e.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client GST</label>
                    <input
                      value={form.clientGST}
                      onChange={e => setFormField('clientGST', e.target.value.toUpperCase())}
                      placeholder="Client GST"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Line Items */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Line Items</h2>
                  <span className="text-xs text-slate-400">{form.items.filter(i => i.description).length} item(s)</span>
                </div>
                <div className="space-y-3">
                  {/* Header row */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-3">
                    <div className="sm:col-span-5">Description</div>
                    <div className="sm:col-span-2">HSN/SAC</div>
                    <div className="sm:col-span-2">Qty</div>
                    <div className="sm:col-span-2">Unit Price (₹)</div>
                    <div className="sm:col-span-1" />
                  </div>

                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 px-3 py-3 rounded-xl border border-transparent focus-within:border-blue-200 focus-within:bg-white transition-all">
                      <div className="sm:col-span-5">
                        <input
                          required placeholder="Item description"
                          value={item.description}
                          onChange={e => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          placeholder="HSN/SAC"
                          value={item.hsn}
                          onChange={e => handleItemChange(idx, 'hsn', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number" min="1" step="any" required
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center sm:text-left"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number" min="0" step="0.01" required
                          value={item.unitPrice}
                          onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right sm:text-left"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button" onClick={() => removeItem(idx)}
                          disabled={form.items.length === 1}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button" onClick={addItem}
                  className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 rounded-xl py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" /> Add Item
                </button>
              </div>

              {/* Section: Adjustments & Summary */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Totals &amp; Adjustments</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: adjustments */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-600">Discount (%)</label>
                      <input
                        type="number" min="0" max="100" step="0.1"
                        value={form.discount}
                        onChange={e => setFormField('discount', e.target.value)}
                        className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-600">GST (%)</label>
                      <input
                        type="number" min="0" max="100" step="0.1"
                        value={form.tax}
                        onChange={e => setFormField('tax', e.target.value)}
                        className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                      />
                    </div>
                  </div>
                  {/* Right: dark summary card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Summary</p>
                    <div className="flex justify-between text-slate-300 text-sm">
                      <span>Subtotal</span><span className="font-mono">₹{subtotal.toFixed(2)}</span>
                    </div>
                    {parseFloat(form.discount) > 0 && (
                      <div className="flex justify-between text-emerald-400 text-sm">
                        <span>Discount ({form.discount}%)</span><span className="font-mono">-₹{discAmt.toFixed(2)}</span>
                      </div>
                    )}
                    {parseFloat(form.tax) > 0 && (
                      <div className="flex justify-between text-blue-300 text-sm">
                        <span>GST ({form.tax}%)</span><span className="font-mono">+₹{taxAmt.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                      <span className="text-xl font-extrabold">Total</span>
                      <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-mono">
                        ₹{total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Watermark */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Watermark <span className="text-slate-300 font-normal normal-case text-xs ml-1">optional</span></h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {WATERMARK_PRESETS.map(p => (
                    <button
                      key={p || 'none'} type="button"
                      onClick={() => setFormField('watermark', p)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                        form.watermark === p ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {p || 'None'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="text" maxLength={20}
                    placeholder="Or type a custom watermark…"
                    value={form.watermark}
                    onChange={e => setFormField('watermark', e.target.value.toUpperCase())}
                    className="w-72 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest font-medium"
                  />
                  {form.watermark && (
                    <button type="button" onClick={() => setFormField('watermark', '')} className="text-xs text-slate-400 hover:text-red-500">Clear</button>
                  )}
                </div>
              </div>

              {/* Section: Disclaimer */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Disclaimer</h2>
                <textarea
                  rows={3}
                  value={form.disclaimer}
                  onChange={e => setFormField('disclaimer', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

            </form>
          </div>

          {/* ── Live Preview Panel ── */}
          {previewMode && (
            <div className="lg:w-1/2 lg:sticky lg:top-20 lg:self-start">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <EyeIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-bold text-slate-700">Live Preview</span>
                  <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Updates in real time</span>
                </div>
                <InvoiceLivePreview form={form} settings={settings} clients={clients} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <InvoiceSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
        clients={clients}
        onAddClient={handleAddClient}
      />
    </div>
  );
};

export default InvoicePro;
