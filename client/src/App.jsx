import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Dashboard from './pages/dashboard/Dashboard';
import Settings from './pages/business/Settings';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Clients from './pages/clients/Clients';
import InvoicesList from './pages/invoices/InvoicesList';
import NewInvoice from './pages/invoices/NewInvoice';

// Layout Component
const Layout = ({ children }) => {
    const { business, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Premium Glassmorphism Navigation */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-8">
                            <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Invoicefy
                            </span>

                            <div className="hidden md:flex space-x-1">
                                <NavLink to="/dashboard" className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                                    Dashboard
                                </NavLink>
                                <NavLink to="/clients" className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                                    Clients
                                </NavLink>
                                <NavLink to="/invoices" className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                                    Invoices
                                </NavLink>
                                <NavLink to="/settings" className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                                    Settings
                                </NavLink>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-slate-500 hidden sm:block">
                                {business?.name}
                            </span>
                            <button
                                onClick={() => logout()}
                                className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
                {children}
            </main>
        </div>
    );
};

// Private Route Component
const PrivateRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <Toaster position="top-right" />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route
                        path="/dashboard"
                        element={
                            <PrivateRoute>
                                <Layout>
                                    <Dashboard />
                                </Layout>
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/settings"
                        element={
                            <PrivateRoute>
                                <Layout>
                                    <Settings />
                                </Layout>
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/clients"
                        element={
                            <PrivateRoute>
                                <Layout>
                                    <Clients />
                                </Layout>
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/invoices"
                        element={
                            <PrivateRoute>
                                <Layout>
                                    <InvoicesList />
                                </Layout>
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/invoices/new"
                        element={
                            <PrivateRoute>
                                <Layout>
                                    <NewInvoice />
                                </Layout>
                            </PrivateRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
