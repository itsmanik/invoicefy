import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { invoicesAPI, clientsAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DocumentTextIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const NewInvoice = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [clientId, setClientId] = useState('');
    const [tax, setTax] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [items, setItems] = useState([
        { description: '', quantity: 1, unitPrice: 0 }
    ]);

    // Derived state (Totals)
    const [totals, setTotals] = useState({ subtotal: 0, taxAmount: 0, total: 0 });

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        calculateTotals();
    }, [items, tax, discount]);

    const fetchClients = async () => {
        try {
            const res = await clientsAPI.getAll();
            setClients(res.data?.clients || []);
        } catch (error) {
            toast.error('Failed to load clients. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);

        const discountAmount = subtotal * (parseFloat(discount) || 0) / 100;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = taxableAmount * (parseFloat(tax) || 0) / 100;
        const total = taxableAmount + taxAmount;

        setTotals({
            subtotal: subtotal.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            total: total.toFixed(2)
        });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItemRow = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
    };

    const removeItemRow = (index) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!clientId) return toast.error('Please select a client');

        // Clean items (remove empty rows)
        const validItems = items.filter(i => i.description.trim() !== '' && i.quantity > 0);
        if (validItems.length === 0) return toast.error('Please add at least one valid item');

        try {
            setSubmitting(true);
            await invoicesAPI.create({
                clientId,
                items: validItems,
                tax: parseFloat(tax) || 0,
                discount: parseFloat(discount) || 0
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
                <div className="p-8 space-y-8">
                    {/* Header section (Client) */}
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
                                    onChange={(e) => setClientId(e.target.value)}
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
                            <label className="block text-sm font-bold text-slate-700 mb-2">Invoice Number</label>
                            <input
                                type="text"
                                disabled
                                value="[Auto-generated on save]"
                                className="block w-full border-slate-200 bg-slate-100 text-slate-500 rounded-xl px-4 py-3 border font-medium"
                            />
                        </div>
                    </div>

                    {/* Items Section */}
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-6 border-b pb-3 block">Invoice Line Items</h3>
                        <div className="space-y-4">
                            <div className="hidden sm:grid sm:grid-cols-12 sm:gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">
                                <div className="sm:col-span-6">Description</div>
                                <div className="sm:col-span-2">Quantity</div>
                                <div className="sm:col-span-3">Unit Price (₹)</div>
                                <div className="sm:col-span-1 border-transparent"></div>
                            </div>

                            {items.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-transparent focus-within:border-blue-200 focus-within:bg-white transition-all">
                                    <div className="sm:col-span-6">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Item description"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            className="block w-full border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 placeholder-slate-400"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            step="any"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="block w-full border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 text-center sm:text-left"
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                            className="block w-full border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 text-right sm:text-left"
                                        />
                                    </div>
                                    <div className="sm:col-span-1 flex justify-end sm:justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeItemRow(index)}
                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-30"
                                            disabled={items.length === 1}
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={addItemRow}
                                className="inline-flex items-center px-4 py-2 border-2 border-dashed border-blue-200 text-sm font-bold rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors w-full justify-center"
                            >
                                <PlusIcon className="h-5 w-5 mr-2" /> Add another item
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-8 mt-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Settings (Tax/Discount) */}
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
                                    <label className="text-sm font-bold text-slate-600">Tax (%)</label>
                                    <input
                                        type="number" min="0" max="100" step="0.1"
                                        value={tax} onChange={(e) => setTax(e.target.value)}
                                        className="block w-32 border-slate-200 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-semibold"
                                    />
                                </div>
                            </div>

                            {/* Totals Display */}
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-lg border border-slate-700 text-white">
                                <h4 className="font-bold text-slate-300 mb-6 uppercase tracking-widest text-xs">Invoice Summary</h4>
                                <dl className="space-y-4">
                                    <div className="flex justify-between items-center text-slate-300">
                                        <dt className="font-medium text-lg">Subtotal</dt>
                                        <dd className="font-mono text-lg">₹{totals.subtotal}</dd>
                                    </div>
                                    {discount > 0 && (
                                        <div className="flex justify-between items-center text-emerald-400">
                                            <dt className="font-medium">Discount ({discount}%)</dt>
                                            <dd className="font-mono">-₹{(totals.subtotal * (discount / 100)).toFixed(2)}</dd>
                                        </div>
                                    )}
                                    {tax > 0 && (
                                        <div className="flex justify-between items-center text-blue-300">
                                            <dt className="font-medium">Tax ({tax}%)</dt>
                                            <dd className="font-mono">+₹{totals.taxAmount}</dd>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center border-t border-slate-700 pt-6 mt-6">
                                        <dt className="text-2xl font-extrabold text-white">Total</dt>
                                        <dd className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-mono">₹{totals.total}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
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
