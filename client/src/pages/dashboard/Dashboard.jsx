import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { invoicesAPI, clientsAPI, analyticsAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  CurrencyRupeeIcon,
  DocumentTextIcon,
  UsersIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { business } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalInvoices: 0,
    totalClients: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [invoicesRes, clientsRes, statsRes] = await Promise.all([
        invoicesAPI.getAll(),
        clientsAPI.getAll(),
        analyticsAPI.getDashboardStats().catch(() => null), // In case endpoint doesn't exist
      ]);

      const invoices = invoicesRes.data?.invoices || [];
      const clients = clientsRes.data?.clients || [];

      // Calculate stats
      const totalInvoices = invoices.length;
      const totalClients = clients.length;
      const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length;
      const unpaidInvoices = invoices.filter(inv => inv.status === 'Unpaid').length;
      const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue').length;
      const totalRevenue = invoices
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      setStats({
        totalRevenue,
        totalInvoices,
        totalClients,
        paidInvoices,
        unpaidInvoices,
        overdueInvoices,
        pendingInvoices: unpaidInvoices + overdueInvoices,
      });

      // Get recent invoices (last 5)
      setRecentInvoices(invoices.slice(0, 5));

    } catch (error) {
      toast.error('Failed to fetch dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const statCards = [
    {
      name: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: CurrencyRupeeIcon,
      bgColor: 'bg-green-500',
    },
    {
      name: 'Total Invoices',
      value: stats.totalInvoices,
      icon: DocumentTextIcon,
      bgColor: 'bg-blue-500',
      subtext: `${stats.paidInvoices} paid`,
    },
    {
      name: 'Total Clients',
      value: stats.totalClients,
      icon: UsersIcon,
      bgColor: 'bg-purple-500',
    },
    {
      name: 'Pending Invoices',
      value: stats.pendingInvoices,
      icon: ClockIcon,
      bgColor: 'bg-yellow-500',
      subtext: `${stats.overdueInvoices} overdue`,
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, <span className="text-blue-600">{business?.name || 'Business Owner'}</span>!
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Here's a quick overview of your business today.</p>
        </div>
        <Link
          to="/invoices/new"
          className="mt-6 md:mt-0 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all transform active:scale-95 inline-flex items-center font-semibold"
        >
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Create New Invoice
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <div
            key={stat.name}
            className={`overflow-hidden relative rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${i === 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' :
                i === 1 ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' :
                  i === 2 ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white' :
                    'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
              }`}
          >
            <div className="absolute -right-4 -top-4 opacity-20">
              <stat.icon className="h-32 w-32" />
            </div>
            <div className="p-6 relative z-10">
              <div className="flex items-center">
                <div className="ml-2 w-0 flex-1">
                  <dt className="text-sm font-medium text-white/80 truncate mb-1">
                    {stat.name}
                  </dt>
                  <dd className="text-3xl font-bold tracking-tight">
                    {stat.value}
                  </dd>
                  {stat.subtext && (
                    <dd className="text-xs font-semibold bg-white/20 inline-block px-2 py-1 rounded-md mt-3">
                      {stat.subtext}
                    </dd>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Invoices */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-3xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-medium text-gray-900">Recent Invoices</h2>
          <Link to="/invoices" className="text-sm text-blue-600 hover:text-blue-800">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          {recentInvoices.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      <Link to={`/invoices/${invoice.id}`}>
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.client?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(invoice.total || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                          ${invoice.status === 'Paid'
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'Unpaid'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first invoice.
              </p>
              <div className="mt-6">
                <Link
                  to="/invoices/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Create Invoice
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/clients"
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all flex items-center space-x-5 group"
        >
          <div className="bg-blue-50 rounded-xl p-4 group-hover:bg-blue-600 transition-colors">
            <UsersIcon className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Add New Client</h3>
            <p className="text-sm text-slate-500">Create a client profile</p>
          </div>
        </Link>

        <Link
          to="/invoices"
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-emerald-200 transition-all flex items-center space-x-5 group"
        >
          <div className="bg-emerald-50 rounded-xl p-4 group-hover:bg-emerald-600 transition-colors">
            <DocumentTextIcon className="h-8 w-8 text-emerald-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Manage Invoices</h3>
            <p className="text-sm text-slate-500">View and update invoices</p>
          </div>
        </Link>

        <Link
          to="/settings"
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-purple-200 transition-all flex items-center space-x-5 group"
        >
          <div className="bg-purple-50 rounded-xl p-4 group-hover:bg-purple-600 transition-colors">
            <CurrencyRupeeIcon className="h-8 w-8 text-purple-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Business Settings</h3>
            <p className="text-sm text-slate-500">Update business details</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;