import React, { useState, useEffect } from 'react';
import { clientsAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { PlusIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const res = await clientsAPI.getAll();
            setClients(res.data?.clients || []);
        } catch (error) {
            toast.error('Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const res = await clientsAPI.create(formData);
            toast.success('Client added successfully');
            setClients([res.data.client, ...clients]);
            setFormData({ name: '', email: '', phone: '', address: '' });
            setShowForm(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add client');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Clients</h1>
                    <p className="text-slate-500 mt-1">Manage your customer database</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-all hover:shadow-lg active:scale-95"
                >
                    {showForm ? 'Cancel' : (
                        <>
                            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                            Add Client
                        </>
                    )}
                </button>
            </div>

            {showForm && (
                <div className="bg-white shadow-sm border border-slate-100 rounded-3xl mb-8 overflow-hidden animate-fade-in-up">
                    <div className="p-8">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 border-b pb-3">New Client Profile</h3>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Client Name *</label>
                                <input
                                    type="text" name="name" required value={formData.name} onChange={handleChange}
                                    className="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-200 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Acme Corp"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                                <input
                                    type="email" name="email" required value={formData.email} onChange={handleChange}
                                    className="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-200 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="billing@acme.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                <input
                                    type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                    className="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-200 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                                <textarea
                                    name="address" rows={3} value={formData.address} onChange={handleChange}
                                    className="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-200 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                    placeholder="123 Business St, Suite 100..."
                                />
                            </div>
                            <div className="sm:col-span-2 pt-2">
                                <button
                                    type="submit" disabled={submitting}
                                    className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-transparent shadow-md px-8 py-3 bg-blue-600 text-base font-bold text-white hover:bg-blue-700 focus:outline-none transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Client Database'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white shadow-sm border border-slate-100 rounded-3xl overflow-hidden">
                {clients.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                        {clients.map((client) => (
                            <li key={client.id} className="hover:bg-slate-50 transition-colors">
                                <div className="px-6 py-5 flex items-center sm:px-8">
                                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div className="truncate">
                                            <div className="flex text-base">
                                                <p className="font-bold text-slate-900 truncate">{client.name}</p>
                                            </div>
                                            <div className="mt-2 flex">
                                                <div className="flex items-center text-sm text-slate-500">
                                                    <UserIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                                                    <p>{client.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                                            <p className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{client.phone || 'No phone'}</p>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-16 px-4">
                        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No clients</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by adding a new client profile.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Clients;
