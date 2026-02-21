import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invoicesAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DocumentTextIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const InvoicesList = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const res = await invoicesAPI.getAll();
            setInvoices(res.data?.invoices || []);
        } catch (error) {
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
        }).format(amount || 0);
    };

    const handleDownloadPDF = async (id, invoiceNumber) => {
        try {
            toast.loading('Generating PDF...', { id: 'pdf-toast' });
            const res = await invoicesAPI.downloadPDF(id);
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('PDF downloaded!', { id: 'pdf-toast' });
        } catch (error) {
            console.error('Download PDF error:', error);
            toast.error('Failed to download PDF', { id: 'pdf-toast' });
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await invoicesAPI.updateStatus(id, newStatus);
            if (res.data.success) {
                // Instantly update the list state
                setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
                toast.success('Invoice status updated!');
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Invoices</h1>
                    <p className="text-slate-500 mt-1">Track and manage your billing</p>
                </div>
                <Link
                    to="/invoices/new"
                    className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all hover:shadow-lg active:scale-95"
                >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Create Invoice
                </Link>
            </div>

            <div className="bg-white shadow-sm border border-slate-100 rounded-3xl overflow-hidden">
                {invoices.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-blue-600">
                                            {invoice.invoiceNumber}
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {invoice.client?.name || `Client #${invoice.clientId}`}
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(invoice.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap text-sm text-slate-900 font-bold">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <select
                                                value={invoice.status}
                                                onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                                                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg border-2 border-transparent transition-all cursor-pointer focus:ring-0 focus:border-blue-300
                                                ${invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' :
                                                        invoice.status === 'Unpaid' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                                                            'bg-rose-100 text-rose-800 hover:bg-rose-200'}`}
                                            >
                                                <option value="Paid" className="bg-white text-slate-900">Paid</option>
                                                <option value="Unpaid" className="bg-white text-slate-900">Unpaid</option>
                                                <option value="Overdue" className="bg-white text-slate-900">Overdue</option>
                                            </select>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                                                className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white rounded-lg transition-colors font-semibold"
                                            >
                                                Download PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-20 px-4">
                        <DocumentTextIcon className="mx-auto h-16 w-16 text-slate-300" />
                        <h3 className="mt-4 text-lg font-bold text-slate-900">No invoices</h3>
                        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">Get started by generating your first beautiful invoice.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoicesList;
