// client/src/components/InvoiceLivePreview.jsx
import React, { useMemo } from 'react';
import { getAssetUrl } from '../services/api';

// Matches pdf.generator.js formatCurr exactly
function fmt(n) {
  return 'Rs.' + (parseFloat(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function numberToWords(num) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                 'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                 'Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const toW = (n) => {
    if (n === 0)        return '';
    if (n < 20)         return ones[n] + ' ';
    if (n < 100)        return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '') + ' ';
    if (n < 1000)       return ones[Math.floor(n/100)] + ' Hundred ' + toW(n%100);
    if (n < 100000)     return toW(Math.floor(n/1000)) + 'Thousand ' + toW(n%1000);
    if (n < 10000000)   return toW(Math.floor(n/100000)) + 'Lakh ' + toW(n%100000);
    return toW(Math.floor(n/10000000)) + 'Crore ' + toW(n%10000000);
  };
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Zero Only';
  return toW(n).trim().replace(/\s+/g, ' ') + ' Only';
}

export default function InvoiceLivePreview({ form, settings, clients }) {
  const client = useMemo(
    () => clients.find(c => String(c.id) === String(form.clientId)),
    [clients, form.clientId]
  );

  // ── Calculations (mirror pdf.generator.js) ──────────────────────────────
  const subtotal    = (form.items || []).reduce(
    (s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0
  );
  const discPct     = parseFloat(form.discount) || 0;
  const discAmt     = subtotal * discPct / 100;
  const taxable     = subtotal - discAmt;
  const taxVal      = parseFloat(form.tax) || 0;
  const hasTax      = taxVal > 0;
  // In the PDF, tax is stored as the tax *amount* (not %), derive the percent:
  const taxPercent  = hasTax && taxable > 0 ? Math.round((taxVal / taxable) * 100) : 0;
  const halfTax     = taxPercent / 2;
  const taxAmt      = hasTax ? taxVal : 0;
  const total       = taxable + taxAmt;

  // ── Template colours (same defaults as pdf.generator.js) ────────────────
  const template    = settings.templateId || 'classic';
  const navy        = settings.headerColor ||
    (template === 'minimal' ? '#111827' : template === 'bold' ? '#1E293B' : '#2563EB');
  const accent      = settings.accentColor ||
    (template === 'minimal' ? '#6B7280' : template === 'bold' ? '#F59E0B' : '#1d4ed8');

  const documentType  = form.documentType || 'invoice';
  const documentLabel = documentType === 'quotation' ? 'QUOTATION' : 'TAX INVOICE';
  const invoiceNumber = `${documentType === 'quotation' ? 'QUO' : (settings.invoicePrefix || 'INV')}-0001`;

  const logoSrc       = settings.logoPreview || getAssetUrl(settings.logoUrl);
  const showDividers  = settings.showRowDividers !== false;

  const visibleItems = (form.items || []).filter(i => i.description);

  // Bank details
  const bd    = settings;
  const hasBD = !!(bd.accountHolderName || bd.accountNumber || bd.ifsc || bd.upiId);
  const bdRows = [];
  if (bd.accountHolderName) bdRows.push(['Account Name', bd.accountHolderName]);
  if (bd.accountNumber)     bdRows.push(['Account No.',  bd.accountNumber]);
  if (bd.ifsc)              bdRows.push(['IFSC Code',    bd.ifsc]);
  if (bd.upiId)             bdRows.push(['UPI ID',       bd.upiId]);
  if (bd.panNumber)         bdRows.push(['PAN',          bd.panNumber]);

  // Table columns — mirrors pdf.generator.js cols exactly
  const cols = hasTax ? [
    { label: 'Description',        align: 'left',   flex: '2.2' },
    { label: 'SAC',                align: 'center', flex: '0.7' },
    { label: 'Taxable',            align: 'right',  flex: '1.1' },
    { label: `CGST ${halfTax}%`,   align: 'right',  flex: '1'   },
    { label: `SGST ${halfTax}%`,   align: 'right',  flex: '1'   },
    { label: 'Total',              align: 'right',  flex: '1.1' },
  ] : [
    { label: 'Description',        align: 'left',   flex: '3'   },
    { label: 'SAC',                align: 'center', flex: '0.7' },
    { label: 'Qty',                align: 'center', flex: '0.7' },
    { label: 'Unit Price',         align: 'right',  flex: '1.4' },
    { label: 'Total',              align: 'right',  flex: '1.2' },
  ];

  const thAlign = { left: 'text-left', center: 'text-center', right: 'text-right' };

  return (
    /*
     * Outer wrapper — mimics A4 paper proportions in a scrollable preview box.
     * Everything inside uses the exact same structure order as pdf.generator.js:
     *   1. Header bar
     *   2. Meta row (invoice no / dates)
     *   3. Divider
     *   4. FROM / BILL TO
     *   5. Items table (straight rect header, no border-radius)
     *   6. Totals + Bank side by side
     *   7. Footer bar with signature inside
     */
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner text-[9px] text-slate-800 font-sans">

      {/* ── 1. HEADER BAR ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: navy, minHeight: 72 }}>
        {/* Left: logo + company */}
        <div className="flex items-center gap-2.5">
          {logoSrc && (
            <img src={logoSrc} alt="logo" className="h-10 w-10 object-contain rounded" />
          )}
          <div>
            <div className="text-[20px] font-bold text-white leading-tight">
              {settings.companyName || 'Invoicefy'}
            </div>
            {settings.companyAddress && (
              <div className="text-[8px] mt-1" style={{ color: '#CBD5E1' }}>
                {settings.companyAddress}
              </div>
            )}
          </div>
        </div>
        {/* Right: document label */}
        <div className="text-[22px] font-black text-white tracking-wide">
          {documentLabel}
        </div>
      </div>

      {/* ── 2. META ROW ───────────────────────────────────────────────── */}
      <div className="flex justify-end px-5 pt-2 pb-1 gap-4 text-[8px]">
        <div className="text-right space-y-0.5">
          <div className="text-slate-500">{invoiceNumber}</div>
          <div className="text-slate-500">Date: {form.invoiceDate || '—'}</div>
          <div className="font-bold" style={{ color: accent }}>
            Due: {form.invoiceDate
              ? new Date(new Date(form.invoiceDate).getTime() + 30*24*60*60*1000)
                  .toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
              : '—'}
          </div>
          {form.watermark && (
            <div
              className="inline-block px-2 py-0.5 text-[7.5px] font-bold uppercase mt-1"
              style={{ background: `${accent}22`, color: accent }}
            >
              {form.watermark}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. DIVIDER ────────────────────────────────────────────────── */}
      <div className="mx-5 border-t border-slate-200" />

      {/* ── 4. FROM / BILL TO ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 px-5 pt-2 pb-3 gap-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
        {/* FROM */}
        <div className="pr-4" style={{ borderRight: '1px solid #E2E8F0' }}>
          <div className="text-[7px] font-bold tracking-widest text-slate-400 mb-1">FROM</div>
          <div className="font-bold text-[11px] text-slate-900">
            {settings.companyName || 'Invoicefy'}
          </div>
          {form.yourGST && (
            <div className="font-bold text-[8px] mt-0.5" style={{ color: navy }}>
              GST: {form.yourGST}
            </div>
          )}
          {settings.companyAddress && (
            <div className="text-[8px] text-slate-500 mt-0.5">{settings.companyAddress}</div>
          )}
        </div>
        {/* BILL TO */}
        <div>
          <div className="text-[7px] font-bold tracking-widest text-slate-400 mb-1">BILL TO</div>
          <div className="font-bold text-[11px] text-slate-900">
            {client?.name || '— Client Name —'}
          </div>
          {(form.clientGST || client?.gstNumber) && (
            <div className="font-bold text-[8px] mt-0.5" style={{ color: navy }}>
              GST: {form.clientGST || client?.gstNumber}
            </div>
          )}
          {[client?.address, client?.email, client?.phone].filter(Boolean).length > 0 && (
            <div className="text-[8px] text-slate-500 mt-0.5">
              {[client?.address, client?.email, client?.phone].filter(Boolean).join(' | ')}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. ITEMS TABLE ───────────────────────────────────────────── */}
      <div className="mx-5 mt-3" style={{ border: '1px solid #E2E8F0' }}>
        {/* Header row */}
        <div
          className="flex text-white text-[8.5px] font-bold"
          style={{ background: navy, padding: '12px 8px' }}
        >
          {cols.map((col, ci) => (
            <div key={ci} style={{ flex: col.flex }} className={thAlign[col.align]}>
              {col.label.split('\n').map((l, li) => <div key={li}>{l}</div>)}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {visibleItems.length === 0 ? (
          <div className="text-center py-4 text-slate-400 italic text-[8px]">No items added yet…</div>
        ) : visibleItems.map((item, idx) => {
          const qty       = parseFloat(item.quantity) || 0;
          const unitPrice = parseFloat(item.unitPrice) || 0;
          const lineBase  = qty * unitPrice;
          const cgst      = hasTax ? lineBase * (halfTax / 100) : 0;
          const sgst      = cgst;
          const lineTotal = hasTax ? lineBase + cgst + sgst : lineBase;

          return (
            <div
              key={idx}
              className="flex items-center text-[8.5px] text-slate-700"
              style={{
                padding: '12px 8px',
                background: idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
                borderBottom: showDividers ? '1px solid #E2E8F0' : 'none',
              }}
            >
              {hasTax ? (
                <>
                  <div style={{ flex: cols[0].flex }} className="text-left">{item.description}</div>
                  <div style={{ flex: cols[1].flex }} className="text-center">{item.hsn || '-'}</div>
                  <div style={{ flex: cols[2].flex }} className="text-right">{fmt(lineBase)}</div>
                  <div style={{ flex: cols[3].flex }} className="text-right">{fmt(cgst)}</div>
                  <div style={{ flex: cols[4].flex }} className="text-right">{fmt(sgst)}</div>
                  <div style={{ flex: cols[5].flex }} className="text-right font-semibold">{fmt(lineTotal)}</div>
                </>
              ) : (
                <>
                  <div style={{ flex: cols[0].flex }} className="text-left">
                    {item.description}{item.hsn ? ` (${item.hsn})` : ''}
                  </div>
                  <div style={{ flex: cols[1].flex }} className="text-center">{item.hsn || '-'}</div>
                  <div style={{ flex: cols[2].flex }} className="text-center">{qty}</div>
                  <div style={{ flex: cols[3].flex }} className="text-right">{fmt(unitPrice)}</div>
                  <div style={{ flex: cols[4].flex }} className="text-right font-semibold">{fmt(lineTotal)}</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 6. TOTALS + BANK SIDE BY SIDE ────────────────────────────── */}
      <div className="flex gap-3 px-5 pt-7 pb-3 items-start">

        {/* LEFT: Bank / Payment details — no border box */}
        {hasBD && (
          <div className="flex-1 min-w-0">
            <div className="text-[8.5px] font-bold mb-1.5" style={{ color: accent }}>
              PAYMENT DETAILS
            </div>
            {bdRows.map(([label, value]) => (
              <div key={label} className="flex gap-1 mb-0.5">
                <span className="text-[8.5px] text-slate-400 w-20 shrink-0">{label}:</span>
                <span className="text-[8.5px] font-bold text-slate-700">{value}</span>
              </div>
            ))}
          </div>
        )}
        {!hasBD && <div className="flex-1" />}

        {/* RIGHT: Totals box — solid border, no border-radius */}
        <div className="shrink-0" style={{ width: 200, border: '1px solid #E2E8F0', padding: '6px 8px' }}>
          {/* Subtotal rows */}
          <div className="space-y-1 mb-1">
            {hasTax ? (
              <>
                <div className="flex justify-between text-[8.5px] text-slate-500">
                  <span>Taxable Amount:</span><span>{fmt(taxable)}</span>
                </div>
                {discPct > 0 && (
                  <div className="flex justify-between text-[8.5px] text-slate-500">
                    <span>Discount ({discPct}%):</span><span>- {fmt(discAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[8.5px] text-slate-500">
                  <span>CGST ({halfTax}%):</span><span>{fmt(taxAmt / 2)}</span>
                </div>
                <div className="flex justify-between text-[8.5px] text-slate-500">
                  <span>SGST ({halfTax}%):</span><span>{fmt(taxAmt / 2)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-[8.5px] text-slate-500">
                  <span>Subtotal:</span><span>{fmt(subtotal)}</span>
                </div>
                {discPct > 0 && (
                  <div className="flex justify-between text-[8.5px] text-slate-500">
                    <span>Discount ({discPct}%):</span><span>- {fmt(discAmt)}</span>
                  </div>
                )}
                {taxVal > 0 && (
                  <div className="flex justify-between text-[8.5px] text-slate-500">
                    <span>Tax:</span><span>+ {fmt(taxAmt)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Thin separator */}
          <div className="border-t border-slate-200 mb-1" />

          {/* GRAND TOTAL */}
          <div
            className="flex justify-between items-center text-white font-bold text-[10px]"
            style={{ background: navy, padding: '5px 8px' }}
          >
            <span>GRAND TOTAL</span>
            <span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* ── 6b. SIGNATURE BLOCK — in body, right-aligned, with space above footer */}
      <div className="px-5 pb-4 flex justify-end" style={{ minHeight: 80 }}>
        <div
          className="text-center"
          style={{
            width: 160,
            borderTop: `1px solid #E2E8F0`,
            paddingTop: 8,
            marginTop: 'auto',
          }}
        >
          <div className="text-[9.5px] font-bold leading-tight" style={{ color: navy }}>
            {settings.companyName || 'Invoicefy'}
          </div>
          <div className="text-[7.5px] mt-1 text-slate-400">
            Authorized Signatory
          </div>
          <div className="text-[7px] mt-0.5" style={{ color: accent }}>
            For {settings.companyName || 'Invoicefy'}
          </div>
        </div>
      </div>

      {/* ── 7. FOOTER BAR — disclaimer only, no signature ────────────── */}
      <div
        className="px-5 flex items-center justify-center"
        style={{ background: navy, minHeight: 32 }}
      >
        <div className="text-[7.5px] text-center" style={{ color: '#CBD5E1' }}>
          {form.disclaimer || 'Payment expected within 45 days from invoice date.'}
        </div>
      </div>

    </div>
  );
}