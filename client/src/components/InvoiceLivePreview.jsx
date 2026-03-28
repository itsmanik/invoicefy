// client/src/components/InvoiceLivePreview.jsx
import React, { useMemo } from 'react';
import { getAssetUrl } from '../services/api';

function fmt(n) {
  return 'Rs. ' + (parseFloat(n) || 0).toLocaleString('en-IN', {
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

  const subtotal    = (form.items || []).reduce(
    (s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0
  );
  const discPct     = parseFloat(form.discount) || 0;
  const discAmt     = subtotal * discPct / 100;
  const taxable     = subtotal - discAmt;
  const taxVal      = parseFloat(form.tax) || 0;
  const hasTax      = taxVal > 0;
  const taxPercent  = hasTax && taxable > 0 ? Math.round((taxVal / taxable) * 100) : 0;
  const halfTax     = taxPercent / 2;
  const taxAmt      = hasTax ? taxVal : 0;
  const total       = taxable + taxAmt;

  const template    = settings.templateId || 'classic';
  const navy        = settings.tableColor   || settings.headerColor ||
    (template === 'minimal' ? '#111827' : template === 'bold' ? '#1E293B' : '#2563EB');
  const accent      = settings.primaryColor || settings.accentColor ||
    (template === 'minimal' ? '#6B7280' : template === 'bold' ? '#F59E0B' : '#1d4ed8');

  const isCustom = template === 'custom' && !!settings.customTemplatePreview;

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const navyBg      = isCustom ? hexToRgba(navy, 0.82) : navy;
  const bodyShadow  = isCustom ? '0 0 4px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.7)' : 'none';

  const documentType  = form.documentType || 'invoice';
  const documentLabel = documentType === 'quotation' ? 'QUOTATION' : 'INVOICE';
  const invoiceNumber = `${documentType === 'quotation' ? 'QUO' : (settings.invoicePrefix || 'INV')}-0001`;

  const logoSrc       = settings.logoPreview || getAssetUrl(settings.logoUrl);
  const showDividers  = settings.showRowDividers !== false;

  const visibleItems = (form.items || []).filter(i => i.description);

  const bd    = settings;
  const hasBD = !!(bd.accountHolderName || bd.accountNumber || bd.ifsc || bd.upiId || bd.panNumber);
  const bdRows = [];
  if (bd.accountHolderName) bdRows.push(['Name', bd.accountHolderName]);
  if (bd.accountNumber)     bdRows.push(['Account',  bd.accountNumber]);
  if (bd.panNumber)         bdRows.push(['PAN',          bd.panNumber]);
  if (bd.ifsc)              bdRows.push(['IFS code',    bd.ifsc]);
  if (bd.upiId)             bdRows.push(['UPI ID',       bd.upiId]);

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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner text-[9px] text-slate-800 font-sans relative flex flex-col min-h-full">
      {template === 'custom' && settings.customTemplatePreview && (
        <div 
          className="absolute inset-0 z-0 opacity-100" 
          style={{ 
            backgroundImage: `url(${settings.customTemplatePreview})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}

      {/* 1. HEADER BAR */}
      <div className="flex items-center justify-between px-5 py-3 relative z-10" style={{ background: isCustom ? 'transparent' : navy, minHeight: 72, textShadow: isCustom ? bodyShadow : 'none' }}>
        <div className="flex items-center gap-2.5">
          {logoSrc && (
            <img src={logoSrc} alt="logo" className="h-12 w-12 object-contain rounded" />
          )}
          <div>
            <div className="text-[20px] font-bold leading-tight" style={{ color: isCustom ? navy : 'white' }}>
              {settings.companyName || 'Invoicefy'}
            </div>
            {settings.companyAddress && (
              <div className="text-[8px] mt-1" style={{ color: isCustom ? '#334155' : '#CBD5E1' }}>
                {settings.companyAddress}
              </div>
            )}
          </div>
        </div>
        <div className="text-[22px] font-black tracking-wide" style={{ color: isCustom ? navy : 'white' }}>
          {documentLabel}
        </div>
      </div>

      {/* 2. META ROW */}
      <div className="flex justify-end px-5 pt-2 pb-1 gap-4 text-[8px] relative z-10" style={{ textShadow: bodyShadow }}>
        <div className="text-right space-y-0.5">
          <div className="text-slate-500">{invoiceNumber}</div>
          <div className="text-slate-500">Date: {form.invoiceDate || '—'}</div>
          <div className="font-bold" style={{ color: accent }}>
            Due: {form.invoiceDate
              ? new Date(new Date(form.invoiceDate).getTime() + 30*24*60*60*1000)
                  .toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
              : '—'}
          </div>
        </div>
      </div>

      <div className="mx-5 border-t border-slate-200" />

      {/* 3. BILL TO / FROM */}
      <div className="grid grid-cols-2 px-5 pt-4 pb-4 gap-4 relative z-10" style={{ textShadow: bodyShadow }}>
        <div className="pr-4">
          <div className="text-[12px] font-black text-black mb-1.5">BILL TO:</div>
          <div className="text-[10px] text-black"><span className="font-bold">Name: </span>{client?.name || '— Client Name —'}</div>
          {client?.address && <div className="text-[9px] text-black mt-1 whitespace-pre-wrap"><span className="font-bold">Address: </span>{client.address}</div>}
          {client?.email && <div className="text-[9px] text-black mt-1"><span className="font-bold">Email: </span>{client.email}</div>}
          {client?.phone && <div className="text-[9px] text-black mt-0.5"><span className="font-bold">Ph No: </span>{client.phone}</div>}
          {(form.clientGST || client?.gstNumber) && <div className="text-[9px] text-black mt-1"><span className="font-bold">GSTIN: </span>{form.clientGST || client.gstNumber}</div>}
        </div>
        <div>
          <div className="text-[12px] font-black text-black mb-1.5">FROM:</div>
          <div className="text-[10px] text-black"><span className="font-bold">Name: </span>{settings.companyName || settings.name || 'Invoicefy'}</div>
          {(settings.companyAddress || settings.address) && <div className="text-[9px] text-black mt-1 whitespace-pre-wrap"><span className="font-bold">Address: </span>{settings.companyAddress || settings.address}</div>}
          {(settings.companyEmail || settings.email) && <div className="text-[9px] text-black mt-1"><span className="font-bold">Email: </span>{settings.companyEmail || settings.email}</div>}
          {(settings.companyPhone || settings.phone) && <div className="text-[9px] text-black mt-0.5"><span className="font-bold">Ph No: </span>{settings.companyPhone || settings.phone}</div>}
          {form.yourGST && <div className="text-[9px] text-black mt-1"><span className="font-bold">GSTIN: </span>{form.yourGST}</div>}
        </div>
      </div>

      {/* 4. ENLARGED ITEMS TABLE */}
      <div className="mx-5 mt-3 relative z-10 flex flex-col" style={{ border: '1px solid #000' }}>
        <div className="flex text-white text-[9px] font-bold tracking-widest" style={{ background: navyBg, padding: '12px 10px' }}>
          {cols.map((col, ci) => (
            <div key={ci} style={{ flex: col.flex }} className={thAlign[col.align]}>
              {col.label.split('\n').map((l, li) => <div key={li}>{l}</div>)}
            </div>
          ))}
        </div>

        {/* This wrapper forces the empty space below items to stretch down */}
        <div className="flex flex-col" style={{ minHeight: '250px' }}>
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
                className="flex items-center text-[9px] text-slate-900"
                style={{
                  padding: '12px 10px',
                  background: isCustom ? 'transparent' : '#fff',
                  borderBottom: showDividers ? '1px solid #E2E8F0' : 'none',
                  textShadow: bodyShadow,
                }}
              >
                {hasTax ? (
                  <>
                    <div style={{ flex: cols[0].flex }} className="text-left">{idx + 1}. {item.description}</div>
                    <div style={{ flex: cols[1].flex }} className="text-center">{item.hsn || '-'}</div>
                    <div style={{ flex: cols[2].flex }} className="text-right">{fmt(lineBase)}</div>
                    <div style={{ flex: cols[3].flex }} className="text-right">{fmt(cgst)}</div>
                    <div style={{ flex: cols[4].flex }} className="text-right">{fmt(sgst)}</div>
                    <div style={{ flex: cols[5].flex }} className="text-right font-semibold">{fmt(lineTotal)}</div>
                  </>
                ) : (
                  <>
                    <div style={{ flex: cols[0].flex }} className="text-left">
                      {idx + 1}. {item.description}{item.hsn ? ` (${item.hsn})` : ''}
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
      </div>

      {/* 5. PAYMENT INFO & TOTALS SIDE BY SIDE */}
      <div className="flex justify-between px-5 pt-6 pb-6 items-start relative z-10 flex-grow" style={{ textShadow: bodyShadow }}>
        
        {/* LEFT: Payment Information */}
        <div className="w-[50%] pr-4">
          {hasBD && (
            <>
              <h3 className="font-extrabold text-[11px] mb-3 tracking-wide text-black">PAYMENT INFORMATION:</h3>
              <div className="space-y-1.5 flex flex-col">
                {bdRows.map(([label, value]) => (
                  <div key={label} className="text-[10px] text-black">
                    <span className="font-bold">{label}: </span> 
                    <span className="font-normal">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Subtotal & Total Boxes */}
        <div className="w-[45%] flex flex-col gap-3">
          {/* Subtotal Outline Box */}
          <div className="border border-black px-4 py-3 space-y-2 text-[10px] text-black bg-white">
            {hasTax ? (
              <>
                <div className="flex justify-between"><span>Taxable Amount:</span><span>{fmt(taxable)}</span></div>
                {discPct > 0 && <div className="flex justify-between"><span>Discount:</span><span>- {fmt(discAmt)}</span></div>}
                <div className="flex justify-between"><span>CGST ({halfTax}%):</span><span>{fmt(taxAmt / 2)}</span></div>
                <div className="flex justify-between"><span>SGST ({halfTax}%):</span><span>{fmt(taxAmt / 2)}</span></div>
              </>
            ) : (
              <>
                <div className="flex justify-between"><span>Sub Total:</span><span>{fmt(subtotal)}</span></div>
                {discPct > 0 && <div className="flex justify-between"><span>Discount:</span><span>- {fmt(discAmt)}</span></div>}
                {taxVal > 0 && <div className="flex justify-between"><span>Tax:</span><span>+ {fmt(taxAmt)}</span></div>}
              </>
            )}
          </div>

          {/* Solid Grand Total Box */}
          <div 
            className="flex justify-between items-center text-white font-bold text-[12px] px-4 py-3 tracking-widest"
            style={{ background: navyBg }}
          >
            <span>TOTAL:</span>
            <span>{fmt(total)}/-</span>
          </div>
        </div>
      </div>

      {/* 6. FOOTER BAR */}
      <div className="px-5 mt-auto flex items-center justify-center relative z-10" style={{ background: isCustom ? 'transparent' : navy, minHeight: 32, textShadow: isCustom ? bodyShadow : 'none' }}>
        <div className="text-[7.5px] text-center" style={{ color: isCustom ? '#1E293B' : '#CBD5E1' }}>
          {form.disclaimer || 'Payment expected within 45 days from invoice date.'}
        </div>
      </div>
    </div>
  );
}