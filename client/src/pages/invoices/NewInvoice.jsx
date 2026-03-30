// invoicefy-frontend/src/pages/invoices/NewInvoice.jsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { invoicesAPI, clientsAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DocumentTextIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// ── Reference template previews ───────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Blue header, professional layout',
    preview: (
      <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-200 bg-white text-[6px] select-none">
        <div className="bg-blue-600 text-white px-2 py-1 flex justify-between items-center">
          <span className="font-bold text-[7px]">Invoicefy</span>
          <span className="font-bold text-[8px]">INVOICE</span>
        </div>
        <div className="px-2 pt-1 space-y-0.5">
          <div className="text-[5px] text-gray-500">BILL TO: Client Name</div>
          <div className="mt-1 bg-blue-600 text-white px-1 py-0.5 flex gap-4">
            <span>Description</span><span className="ml-auto">Qty</span><span>Total</span>
          </div>
          <div className="flex gap-4 px-1 border-b border-gray-100 pb-0.5">
            <span className="text-gray-700">Item 1</span><span className="ml-auto text-gray-700">1</span><span className="text-gray-700">₹100</span>
          </div>
          <div className="flex justify-end pr-1 pt-0.5">
            <span className="text-blue-600 font-bold">TOTAL: ₹100</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Clean black & white, simple lines',
    preview: (
      <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-200 bg-white text-[6px] select-none px-2 pt-2">
        <div className="flex justify-between items-end border-b-2 border-black pb-1 mb-1">
          <span className="font-bold text-[8px] text-gray-900">Invoicefy</span>
          <span className="text-gray-500 text-[7px]">INVOICE</span>
        </div>
        <div className="text-gray-400 text-[5px] mb-1">No: INV-001 · Date: 01/01/2025</div>
        <div className="text-gray-500 text-[5px] mb-1">BILL TO: Client Name</div>
        <div className="bg-gray-50 flex gap-3 px-1 py-0.5 text-gray-500">
          <span>DESCRIPTION</span><span className="ml-auto">QTY</span><span>AMOUNT</span>
        </div>
        <div className="flex gap-3 px-1 border-b border-gray-200 py-0.5 text-gray-700">
          <span>Item 1</span><span className="ml-auto">1</span><span>₹100</span>
        </div>
        <div className="flex justify-end pr-1 pt-0.5 font-bold text-gray-900">TOTAL: ₹100</div>
      </div>
    )
  },
  {
    id: 'bold',
    label: 'Bold',
    description: 'Dark navy header, amber accents',
    preview: (
      <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-200 bg-white text-[6px] select-none">
        <div className="bg-slate-800 text-white px-2 py-1.5 flex justify-between items-center">
          <span className="font-bold text-[7px]">Invoicefy</span>
          <span className="font-bold text-[9px] text-yellow-400">INVOICE</span>
        </div>
        <div className="bg-slate-800 text-slate-400 px-2 pb-1 text-[5px]">
          No: INV-001 · Date: 01/01/2025
        </div>
        <div className="px-2 pt-1 space-y-0.5">
          <div className="text-yellow-500 text-[5px] font-bold">BILLED TO</div>
          <div className="text-slate-700 text-[5px]">Client Name</div>
          <div className="bg-slate-800 text-white px-1 py-0.5 flex gap-3 mt-1">
            <span>ITEM</span><span className="ml-auto">QTY</span><span>TOTAL</span>
          </div>
          <div className="flex gap-3 px-1 text-slate-600">
            <span>Item 1</span><span className="ml-auto">1</span><span>₹100</span>
          </div>
        </div>
      </div>
    )
  }
];

// ── Watermark presets ─────────────────────────────────────────────────────────
const WATERMARK_PRESETS = ['', 'DRAFT', 'PAID', 'CONFIDENTIAL', 'SAMPLE', 'VOID'];

// ─────────────────────────────────────────────────────────────────────────────
const NewInvoice = () => {
  const navigate   = useNavigate();
  const [loading,    setLoading]    = useState(true);
  const [clients,    setClients]    = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [clientId,   setClientId]   = useState('');
  const [tax,        setTax]        = useState(0);
  const [discount,   setDiscount]   = useState(0);
  const [items,      setItems]      = useState([{ description: '', hsn: '', quantity: 1, unitPrice: 0 }]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [yourGST, setYourGST] = useState('');
  const [clientGST, setClientGST] = useState('');
  const [disclaimer, setDisclaimer] = useState('Payment expected within 45 days from invoice date. Invoice will not be valid after 45 days.');
  const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', ifsc: '', bankName: '', upiId: '', panNumber: '' });
  const [template,   setTemplate]   = useState('classic');   // ← NEW
  const [watermark,  setWatermark]  = useState('');          // ← NEW

  const [totals, setTotals] = useState({ subtotal: 0, taxAmount: 0, total: 0 });

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { calculateTotals(); }, [items, tax, discount]);

  const fetchClients = async () => {
    try {
      const res = await clientsAPI.getAll();
      setClients(res.data?.clients || []);
      const business = JSON.parse(localStorage.getItem('business') || '{}');
      if (business?.gstNumber) setYourGST(business.gstNumber);
    } catch {
      toast.error('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal       = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);
    const discountAmount = subtotal * (parseFloat(discount) || 0) / 100;
    const taxableAmount  = subtotal - discountAmount;
    const taxAmount      = taxableAmount * (parseFloat(tax) || 0) / 100;
    setTotals({
      subtotal:  subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total:     (taxableAmount + taxAmount).toFixed(2)
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItemRow    = ()      => setItems([...items, { description: '', hsn: '', quantity: 1, unitPrice: 0 }]);
  const removeItemRow = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) return toast.error('Please select a client');
    const validItems = items.filter(i => i.description.trim() !== '' && i.quantity > 0);
    if (validItems.length === 0) return toast.error('Please add at least one valid item');

    try {
      setSubmitting(true);
      await invoicesAPI.create({
        clientId,
        items:    validItems,
        tax:      parseFloat(tax)      || 0,
        discount: parseFloat(discount) || 0,
        invoiceDate,
        yourGST,
        clientGST,
        disclaimer,
        bankDetails,
        template,
        watermark,
        templateSettings: {
          customTemplateUrl: JSON.parse(localStorage.getItem('business') || '{}').customTemplateUrl
        }
      });
      toast.success('Invoice created successfully!');
      navigate('/invoices');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      {/* Page header */}
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create New Invoice</h1>
          <p className="text-slate-500 mt-1">Fill out the details below to generate an invoice.</p>
        </div>
        <Link to="/invoices" className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold transition-colors">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-3xl border border-slate-100 overflow-hidden">
        <div className="p-8 space-y-10">

          {/* ── Client & Invoice Number ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-slate-100">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Client *</label>
              {clients.length === 0 ? (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 space-y-2">
                  <p className="font-medium">You need to add a client before creating an invoice.</p>
                  <Link to="/clients" className="text-blue-600 underline font-semibold">Add Client Now</Link>
                </div>
              ) : (
                <select
                  required
                  value={clientId}
                  onChange={(e) => {
                    const selectedClient = clients.find((c) => String(c.id) === e.target.value);
                    setClientId(e.target.value);
                    setClientGST(selectedClient?.gstNumber || '');
                  }}
                  className="block w-full px-4 py-3 text-base border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl border transition-all"
                >
                  <option value="">Select a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Invoice Date *</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="block w-full border-slate-200 bg-white text-slate-700 rounded-xl px-4 py-3 border font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Invoice Number</label>
              <input
                type="text" disabled value="[Auto-generated on save]"
                className="block w-full border-slate-200 bg-slate-100 text-slate-500 rounded-xl px-4 py-3 border font-medium"
              />
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-slate-100">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Your GST Number</label>
              <input type="text" value={yourGST} onChange={(e) => setYourGST(e.target.value.toUpperCase())} className="block w-full border-slate-200 rounded-xl px-4 py-3 border" placeholder="22AAAAA0000A1Z5" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Client GST Number</label>
              <input type="text" value={clientGST} onChange={(e) => setClientGST(e.target.value.toUpperCase())} className="block w-full border-slate-200 rounded-xl px-4 py-3 border" placeholder="Client GST" />
            </div>
          </div>

          {/* ── Template Picker ── NEW ─────────────────────────────────────── */}
          <div className="pb-8 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Invoice Template</h3>
            <p className="text-sm text-slate-500 mb-5">Choose a layout for your PDF invoice.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {TEMPLATES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`relative p-3 rounded-2xl border-2 transition-all text-left focus:outline-none
                    ${template === t.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  {template === t.id && (
                    <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                  {t.preview}
                  <p className="mt-2 font-bold text-slate-800 text-sm">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Watermark ── NEW ──────────────────────────────────────────── */}
          <div className="pb-8 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Watermark <span className="text-slate-400 font-normal text-base">(optional)</span></h3>
            <p className="text-sm text-slate-500 mb-4">Adds a faint diagonal text stamp across the PDF (e.g. DRAFT, PAID).</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {WATERMARK_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset || 'none'}
                  onClick={() => setWatermark(preset)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all
                    ${watermark === preset
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
                >
                  {preset || 'None'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                maxLength={20}
                placeholder="Or type a custom watermark text..."
                value={watermark}
                onChange={(e) => setWatermark(e.target.value.toUpperCase())}
                className="block w-72 border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium tracking-widest placeholder-slate-400 placeholder:tracking-normal placeholder:font-normal"
              />
              {watermark && (
                <button
                  type="button"
                  onClick={() => setWatermark('')}
                  className="text-slate-400 hover:text-red-500 text-sm"
                >
                  Clear
                </button>
              )}
            </div>
            {watermark && (
              <p className="mt-2 text-xs text-slate-400">Preview: PDF will show a faint "<span className="font-bold text-slate-600">{watermark}</span>" stamp diagonally.</p>
            )}
          </div>

          {/* ── Line Items ── */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-6 border-b pb-3 block">Invoice Line Items</h3>
            <div className="space-y-4">
              <div className="hidden sm:grid sm:grid-cols-12 sm:gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">
                <div className="sm:col-span-5">Description</div>
                <div className="sm:col-span-2">HSN Code</div>
                <div className="sm:col-span-2">Quantity</div>
                <div className="sm:col-span-2">Unit Price (Rs.)</div>
                <div className="sm:col-span-1"></div>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-transparent focus-within:border-blue-200 focus-within:bg-white transition-all">
                  <div className="sm:col-span-5">
                    <input
                      type="text" required placeholder="Item description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="block w-full border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 placeholder-slate-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text" placeholder="HSN/SAC"
                      value={item.hsn || ''}
                      onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                      className="block w-full border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number" required min="1" step="any"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="block w-full border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 text-center sm:text-left"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number" required min="0" step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      className="block w-full border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 text-right sm:text-left"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end sm:justify-center">
                    <button
                      type="button" onClick={() => removeItemRow(index)}
                      disabled={items.length === 1}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-30"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                type="button" onClick={addItemRow}
                className="inline-flex items-center px-4 py-2 border-2 border-dashed border-blue-200 text-sm font-bold rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors w-full justify-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" /> Add another item
              </button>
            </div>
          </div>

          {/* ── Adjustments & Summary ── */}
          <div className="border-t border-slate-100 pt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 h-fit">
                <h4 className="font-bold text-slate-900 mb-2">Adjustments</h4>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-600">Discount (%)</label>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={discount} onChange={(e) => setDiscount(e.target.value)}
                    className="block w-32 border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-semibold"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-600">GST (%) - auto calculated</label>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={tax} onChange={(e) => setTax(e.target.value)}
                    className="block w-32 border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-semibold"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-lg border border-slate-700 text-white">
                <h4 className="font-bold text-slate-300 mb-6 uppercase tracking-widest text-xs">Invoice Summary</h4>
                <dl className="space-y-4">
                  <div className="flex justify-between items-center text-slate-300">
                    <dt className="font-medium text-lg">Subtotal</dt>
                    <dd className="font-mono text-lg">Rs. {totals.subtotal}</dd>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-emerald-400">
                      <dt className="font-medium">Discount ({discount}%)</dt>
                      <dd className="font-mono">-Rs. {(totals.subtotal * (discount / 100)).toFixed(2)}</dd>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between items-center text-blue-300">
                      <dt className="font-medium">Tax ({tax}%)</dt>
                      <dd className="font-mono">+Rs. {totals.taxAmount}</dd>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-slate-700 pt-6 mt-6">
                    <dt className="text-2xl font-extrabold text-white">Total</dt>
                    <dd className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-mono">Rs. {totals.total}</dd>
                  </div>
                </dl>
                {/* Template & watermark summary */}
                <div className="mt-6 pt-4 border-t border-slate-700 flex gap-4 text-xs text-slate-400">
                  <span>Template: <span className="text-slate-200 font-semibold capitalize">{template}</span></span>
                  {watermark && <span>Watermark: <span className="text-slate-200 font-semibold">{watermark}</span></span>}
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100 h-fit">
                <h4 className="font-bold text-slate-900 mb-2">Payment / Bank Details</h4>
                {['accountName','accountNumber','ifsc','bankName','upiId', 'panNumber'].map((field) => (
                  <input
                    key={field}
                    type="text"
                    value={bankDetails[field]}
                    onChange={(e) => setBankDetails({ ...bankDetails, [field]: e.target.value })}
                    placeholder={field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                    className="block w-full border-slate-200 rounded-xl px-4 py-2 border"
                  />
                ))}
              </div>

            </div>
          </div>
          <div className="pt-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">Disclaimer</label>
            <textarea value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} rows={2} className="block w-full border-slate-200 rounded-xl px-4 py-3 border" />
          </div>
        </div>

        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={submitting || clients.length === 0}
            className="inline-flex justify-center items-center py-3 px-8 rounded-xl shadow-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {submitting ? 'Generating Invoice...' : 'Generate Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewInvoice;
