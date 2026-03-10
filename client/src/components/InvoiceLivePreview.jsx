import React, { useMemo } from 'react';

const TEMPLATE_COLORS = {
  'classic-blue':   { header: '#0e4272', accent: '#1a6bb5' },
  'classic-red':    { header: '#7b1616', accent: '#b52a2a' },
  'classic-green':  { header: '#0d3d2b', accent: '#166f4f' },
  'modern-sidebar': { header: '#2d3748', accent: '#4a5568' },
  'royal-purple':   { header: '#4c1d95', accent: '#8b5cf6' },
  'slate-gold':     { header: '#334155', accent: '#eab308' },
  'midnight':       { header: '#020617', accent: '#6366f1' },
  'minimalist':     { header: '#111111', accent: '#64748b' },
  'custom':         { header: '#4285f4', accent: '#6ba3fb' },
};

function fmt(n) {
  return '₹' + (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceLivePreview({ form, settings, clients }) {
  const client = useMemo(() => clients.find(c => String(c.id) === String(form.clientId)), [clients, form.clientId]);

  const subtotal   = form.items.reduce((s, i) => s + (parseFloat(i.quantity)||0) * (parseFloat(i.unitPrice)||0), 0);
  const discAmt    = subtotal * (parseFloat(form.discount)||0) / 100;
  const taxable    = subtotal - discAmt;
  const taxAmt     = taxable * (parseFloat(form.tax)||0) / 100;
  const total      = taxable + taxAmt;

  const tpl   = settings.templateId || 'classic-blue';
  const cols  = TEMPLATE_COLORS[tpl] || TEMPLATE_COLORS['classic-blue'];
  const hdr   = settings.tableColor  || cols.header;
  const acc   = settings.primaryColor || cols.accent;

  const invoiceNumber = `${settings.invoicePrefix || 'INV'}-001`;

  return (
    <div className="bg-white rounded-xl shadow-inner border border-slate-200 overflow-hidden text-[10px] text-slate-800 select-none" style={{ fontFamily: 'Arial, sans-serif', minHeight: 520 }}>

      {/* Header band */}
      <div className="flex items-start justify-between px-5 py-4" style={{ background: hdr, color: '#fff' }}>
        <div>
          {settings.logoPreview
            ? <img src={settings.logoPreview} alt="logo" className="h-8 object-contain mb-1" />
            : <div className="text-base font-extrabold tracking-wide">{settings.companyName || 'Your Company'}</div>
          }
          <div className="opacity-80 leading-tight mt-1 text-[9px]">
            {settings.companyAddress && <div>{settings.companyAddress}</div>}
            {settings.companyEmail   && <div>{settings.companyEmail}</div>}
            {settings.website        && <div>{settings.website}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black tracking-widest opacity-90">INVOICE</div>
          <div className="text-[9px] opacity-70 mt-1"># {invoiceNumber}</div>
          <div className="text-[9px] opacity-70">Date: {form.invoiceDate || '—'}</div>
        </div>
      </div>

      {/* Bill to */}
      <div className="px-5 py-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: acc }}>Bill To</p>
          <p className="font-bold text-slate-800">{client?.name || '— Client Name —'}</p>
          <p className="text-slate-500 text-[9px] leading-tight">{client?.email || ''}</p>
          <p className="text-slate-500 text-[9px] leading-tight">{client?.address || ''}</p>
          {form.clientGST && <p className="text-[9px] text-slate-500">GST: {form.clientGST}</p>}
        </div>
        <div className="text-right">
          {form.yourGST && <p className="text-[9px] text-slate-500">Your GST: {form.yourGST}</p>}
          {form.watermark && (
            <span className="inline-block text-[8px] font-bold px-2 py-0.5 rounded" style={{ background: acc + '22', color: acc }}>
              {form.watermark}
            </span>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="px-5 pb-2">
        <table className="w-full text-[9px] border-collapse">
          <thead>
            <tr style={{ background: hdr, color: '#fff' }}>
              <th className="text-left px-2 py-1.5 font-semibold">Description</th>
              {form.items.some(i => i.hsn) && <th className="px-2 py-1.5 font-semibold">HSN</th>}
              <th className="px-2 py-1.5 font-semibold text-center">Qty</th>
              <th className="px-2 py-1.5 font-semibold text-right">Rate</th>
              <th className="px-2 py-1.5 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {form.items.filter(i => i.description).map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-2 py-1.5 text-slate-700">{item.description || '—'}</td>
                {form.items.some(i => i.hsn) && <td className="px-2 py-1.5 text-slate-500 text-center">{item.hsn || ''}</td>}
                <td className="px-2 py-1.5 text-center text-slate-700">{item.quantity || 0}</td>
                <td className="px-2 py-1.5 text-right text-slate-700">{fmt(item.unitPrice)}</td>
                <td className="px-2 py-1.5 text-right font-semibold" style={{ color: hdr }}>
                  {fmt((parseFloat(item.quantity)||0) * (parseFloat(item.unitPrice)||0))}
                </td>
              </tr>
            ))}
            {form.items.filter(i => i.description).length === 0 && (
              <tr><td colSpan={5} className="px-2 py-3 text-center text-slate-400 italic">No items added yet…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-5 pb-3">
        <div className="ml-auto w-44 space-y-1 text-[9px]">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span><span>{fmt(subtotal)}</span>
          </div>
          {parseFloat(form.discount) > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount ({form.discount}%)</span><span>-{fmt(discAmt)}</span>
            </div>
          )}
          {parseFloat(form.tax) > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>GST ({form.tax}%)</span><span>+{fmt(taxAmt)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-[12px] pt-1 mt-1 border-t-2" style={{ color: acc, borderColor: acc }}>
            <span>TOTAL</span><span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Bank details */}
      {(settings.accountHolderName || settings.accountNumber || settings.ifsc) && (
        <div className="mx-5 mb-3 rounded-lg p-3" style={{ background: hdr + '14', borderLeft: `3px solid ${acc}` }}>
          <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: acc }}>Payment Details</p>
          {settings.accountHolderName && <p className="text-[9px]">Account: {settings.accountHolderName}</p>}
          {settings.accountNumber     && <p className="text-[9px]">Number: {settings.accountNumber}</p>}
          {settings.ifsc              && <p className="text-[9px]">IFSC: {settings.ifsc}</p>}
          {settings.panNumber         && <p className="text-[9px]">PAN: {settings.panNumber}</p>}
        </div>
      )}

      {/* Disclaimer */}
      {form.disclaimer && (
        <div className="px-5 pb-3 text-[8px] text-slate-400 italic leading-tight border-t border-slate-100 pt-2">
          {form.disclaimer}
        </div>
      )}
    </div>
  );
}
