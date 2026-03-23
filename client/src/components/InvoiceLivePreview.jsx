import React, { useMemo } from 'react';
import { getAssetUrl } from '../services/api';

function fmt(n) {
  return 'Rs. ' + (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceLivePreview({ form, settings, clients }) {
  const client = useMemo(() => clients.find(c => String(c.id) === String(form.clientId)), [clients, form.clientId]);

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);
  const discAmt = subtotal * (parseFloat(form.discount) || 0) / 100;
  const taxable = subtotal - discAmt;
  const taxAmt = taxable * (parseFloat(form.tax) || 0) / 100;
  const total = taxable + taxAmt;

  const template = settings.templateId || 'classic';
  const documentType = form.documentType || 'invoice';
  const documentLabel = documentType === 'quotation' ? 'QUOTATION' : 'INVOICE';
  const invoiceNumber = `${documentType === 'quotation' ? 'QUO' : (settings.invoicePrefix || 'INV')}-0001`;
  const visibleItems = form.items.filter(i => i.description);
  const headerColor = settings.tableColor || (template === 'minimal' ? '#111827' : template === 'bold' ? '#1E293B' : '#2563EB');
  const accentColor = settings.primaryColor || (template === 'minimal' ? '#6B7280' : template === 'bold' ? '#F59E0B' : '#1d4ed8');
  const compactMode = Boolean(settings.compactMode);
  const showRowDividers = settings.showRowDividers !== false;

  const logoSrc = settings.logoPreview || getAssetUrl(settings.logoUrl);

  const renderCompanyIdentity = (textClass = '', detailClass = '') => (
    <div className="flex items-start gap-3">
      {logoSrc ? (
        <img src={logoSrc} alt="Company logo" className="h-12 w-12 rounded-lg object-contain bg-white/90 p-1 shadow-sm" />
      ) : null}
      <div>
        <div className={textClass}>{settings.companyName || 'Invoicefy'}</div>
        <div className={detailClass}>
          {settings.companyAddress && <div>{settings.companyAddress}</div>}
          {settings.companyEmail && <div>{settings.companyEmail}</div>}
        </div>
      </div>
    </div>
  );


  const renderFooter = () => (
    <div className="mt-8 pt-4 border-t border-slate-100 text-[8px] text-center text-slate-500">
      {form.disclaimer && <div className="italic mb-1.5">{form.disclaimer}</div>}
      {(settings.accountNumber || settings.ifsc || settings.accountHolderName) && (
        <div className="not-italic">
          Bank: {settings.accountHolderName || '-'} | A/C: {settings.accountNumber || '-'} | IFSC: {settings.ifsc || '-'} | UPI: -
        </div>
      )}
    </div>
  );

  const renderRows = (rowClass = '', amountClass = '') => visibleItems.length ? visibleItems.map((item, idx) => (
    <tr key={idx} className={rowClass ? rowClass(idx) : ''} style={showRowDividers ? undefined : { borderBottom: 'none' }}>
      <td className="px-3 py-2 text-slate-700">
        {item.description}
        {item.hsn ? <span className="text-slate-400"> (HSN: {item.hsn})</span> : null}
      </td>
      <td className="px-3 py-2 text-center text-slate-700">{item.quantity || 0}</td>
      <td className="px-3 py-2 text-right text-slate-700">{fmt(item.unitPrice)}</td>
      <td className={`px-3 py-2 text-right font-semibold ${amountClass}`}>
        {fmt((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
      </td>
    </tr>
  )) : (
    <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 italic">No items added yet…</td></tr>
  );

  if (template === 'minimal') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-[10px] text-slate-800 shadow-inner">
        <div className="px-6 py-5">
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            {renderCompanyIdentity('text-lg font-bold text-slate-900', 'mt-1 text-[9px] text-slate-500 leading-tight')}
            <div className="text-right">
              <div className="text-base tracking-[0.3em] text-slate-500">{documentLabel}</div>
              <div className="mt-2 text-[9px] text-slate-500">Invoice No: {invoiceNumber}</div>
              <div className="text-[9px] text-slate-500">Date: {form.invoiceDate || '—'}</div>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-4 ${compactMode ? 'py-3' : 'py-5'}`}>
            <div>
              <p className="text-[8px] font-bold tracking-[0.25em]" style={{ color: accentColor }}>BILL TO</p>
              <p className="mt-2 font-semibold text-slate-900">{client?.name || '— Client Name —'}</p>
              <p className="text-[9px] text-slate-500 leading-tight">{client?.address || ''}</p>
              <p className="text-[9px] text-slate-500">{client?.email || ''}</p>
              <p className="text-[9px] text-slate-500">{client?.phone || ''}</p>
            </div>
            <div className="text-right text-[9px] text-slate-500">
              {form.clientGST && <p>Client GST: {form.clientGST}</p>}
              {form.yourGST && <p>Your GST: {form.yourGST}</p>}
              {form.watermark && <p className="mt-2 font-semibold text-slate-700">{form.watermark}</p>}
            </div>
          </div>

          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border border-slate-200">
                <th className="px-3 py-2 text-left">DESCRIPTION</th>
                <th className="px-3 py-2 text-center">QTY</th>
                <th className="px-3 py-2 text-right">RATE</th>
                <th className="px-3 py-2 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>{renderRows(() => 'border-b border-slate-200', 'text-slate-900')}</tbody>
          </table>

          <div className={`ml-auto w-48 space-y-2 text-[9px] text-slate-600 ${compactMode ? 'mt-3' : 'mt-5'}`}>
            <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(subtotal)}</span></div>
            {parseFloat(form.discount) > 0 && <div className="flex justify-between"><span>Discount ({form.discount}%):</span><span>-{fmt(discAmt)}</span></div>}
            {parseFloat(form.tax) > 0 && <div className="flex justify-between"><span>Tax:</span><span>+{fmt(taxAmt)}</span></div>}
            <div className="flex justify-between border-t-2 pt-2 text-sm font-bold" style={{ borderColor: headerColor, color: headerColor }}><span>TOTAL</span><span>{fmt(total)}</span></div>
          </div>
          {renderFooter()}
        </div>
      </div>
    );
  }

  if (template === 'bold') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-[10px] text-slate-800 shadow-inner">
        <div className="px-6 py-5 text-white" style={{ background: headerColor }}>
          <div className="flex items-start justify-between">
            {renderCompanyIdentity('text-xl font-bold', 'mt-1 text-[9px] text-slate-300 leading-tight')}
            <div className="text-right">
              <div className="text-2xl font-black tracking-[0.2em]" style={{ color: accentColor }}>{documentLabel}</div>
              <div className="mt-2 text-[9px] text-slate-300">No: {invoiceNumber}</div>
              <div className="text-[9px] text-slate-300">Date: {form.invoiceDate || '—'}</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className={`grid grid-cols-2 gap-4 ${compactMode ? 'pb-2' : 'pb-4'}`}>
            <div>
              <p className="text-[8px] font-bold tracking-[0.25em]" style={{ color: accentColor }}>BILLED TO</p>
              <p className="mt-2 font-semibold text-slate-900">{client?.name || '— Client Name —'}</p>
              <p className="text-[9px] text-slate-500">{client?.address || ''}</p>
              <p className="text-[9px] text-slate-500">{client?.email || ''}</p>
              <p className="text-[9px] text-slate-500">{client?.phone || ''}</p>
              {form.clientGST && <p className="text-[9px] text-slate-500">Client GST: {form.clientGST}</p>}
              {form.yourGST && <p className="text-[9px] text-slate-500">Your GST: {form.yourGST}</p>}
            </div>
            <div className="text-right">
              {form.watermark && <span className="inline-block rounded px-2 py-1 text-[8px] font-bold uppercase" style={{ background: `${accentColor}22`, color: accentColor }}>{form.watermark}</span>}
            </div>
          </div>

          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="text-white" style={{ background: headerColor }}>
                <th className="px-3 py-2 text-left">ITEM DESCRIPTION</th>
                <th className="px-3 py-2 text-center">QTY</th>
                <th className="px-3 py-2 text-right">PRICE</th>
                <th className="px-3 py-2 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>{renderRows((idx) => idx % 2 === 0 ? 'bg-slate-50' : '', 'text-slate-700')}</tbody>
          </table>

          <div className={`ml-auto w-52 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-[9px] text-slate-600 ${compactMode ? 'mt-3' : 'mt-5'}`}>
            <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(subtotal)}</span></div>
            {parseFloat(form.discount) > 0 && <div className="flex justify-between"><span>Discount ({form.discount}%):</span><span>-{fmt(discAmt)}</span></div>}
            {parseFloat(form.tax) > 0 && <div className="flex justify-between"><span>Tax:</span><span>+{fmt(taxAmt)}</span></div>}
            <div className="-mx-3 -mb-3 mt-2 flex justify-between px-3 py-2 text-sm font-bold text-white" style={{ background: headerColor }}><span>TOTAL</span><span>{fmt(total)}</span></div>
          </div>
          {renderFooter()}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-[10px] text-slate-800 shadow-inner">
      <div className="flex items-start justify-between px-6 py-5 text-white" style={{ background: headerColor }}>
        {renderCompanyIdentity('text-xl font-bold', 'mt-1 text-[9px] text-blue-100 leading-tight')}
        <div className="text-right">
          <div className="text-2xl font-black">{documentLabel}</div>
          <div className="mt-2 text-[9px] text-blue-100">Invoice Number: {invoiceNumber}</div>
          <div className="text-[9px] text-blue-100">Date: {form.invoiceDate || '—'}</div>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-4 pb-5">
          <div>
            <p className="text-[8px] font-bold tracking-[0.25em]" style={{ color: accentColor }}>BILL TO</p>
            <p className="mt-2 font-semibold text-slate-900">{client?.name || '— Client Name —'}</p>
            <p className="text-[9px] text-slate-500">{client?.address || ''}</p>
            <p className="text-[9px] text-slate-500">{client?.email || ''}</p>
            <p className="text-[9px] text-slate-500">{client?.phone || ''}</p>
            {form.clientGST && <p className="text-[9px] text-slate-500">Client GST: {form.clientGST}</p>}
            {form.yourGST && <p className="text-[9px] text-slate-500">Your GST: {form.yourGST}</p>}
          </div>
          <div className="text-right">
            {form.watermark && <span className="inline-block rounded px-2 py-1 text-[8px] font-bold uppercase" style={{ background: `${accentColor}22`, color: accentColor }}>{form.watermark}</span>}
          </div>
        </div>

        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="text-white" style={{ background: headerColor }}>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-center">Quantity</th>
              <th className="px-3 py-2 text-right">Unit Price</th>
              <th className="px-3 py-2 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>{renderRows(() => showRowDividers ? 'border-b border-slate-100' : '', '')}</tbody>
        </table>

        <div className={`ml-auto w-52 bg-slate-50 p-3 space-y-2 text-[9px] text-slate-600 ${compactMode ? 'mt-3' : 'mt-5'}`}>
          <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(subtotal)}</span></div>
          {parseFloat(form.discount) > 0 && <div className="flex justify-between"><span>Discount ({form.discount}%):</span><span>-{fmt(discAmt)}</span></div>}
          {parseFloat(form.tax) > 0 && <div className="flex justify-between"><span>Tax:</span><span>+{fmt(taxAmt)}</span></div>}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold" style={{ color: accentColor }}><span>TOTAL</span><span>{fmt(total)}</span></div>
        </div>

        {renderFooter()}
      </div>
    </div>
  );
}
