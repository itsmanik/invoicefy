import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { validateBusinessRegistration } from '../../utils/validators';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    gstNumber: '',
    address: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const businessErrors = validateBusinessRegistration({
      name: formData.businessName,
      gstNumber: formData.gstNumber,
      address: formData.address,
      email: formData.email,
      phone: formData.phone,
    });

    if (Object.keys(businessErrors).length > 0) {
      setErrors(businessErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    const result = await register({
      ownerName: formData.name,
      email: formData.email,
      password: formData.password,
      businessName: formData.businessName,
      gstNumber: formData.gstNumber,
      address: formData.address,
      phone: formData.phone
    });

    if (result.success) {
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left side - Brand/Graphic */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-800 via-blue-700 to-blue-500 p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-400 blur-3xl opacity-50 mix-blend-multiply"></div>

        <div className="relative z-10 space-y-8 animate-fade-in-up">
          <h1 className="text-5xl font-extrabold text-white tracking-tight">
            Start scaling your <br />
            business <span className="text-blue-200">today.</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-lg leading-relaxed">
            Join thousands of modern businesses sending beautiful invoices and getting paid faster.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-12 bg-slate-50 relative overflow-y-auto">
        <div className="max-w-xl w-full space-y-8 animate-fade-in-up my-auto">
          <div className="text-center lg:text-left pt-6">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Create an account
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-8 pb-10" onSubmit={handleSubmit}>
            <div className="space-y-6">

              {/* Owner Details */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Your Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      name="name" type="text" required value={formData.name} onChange={handleChange}
                      className="appearance-none block w-full px-4 py-2 rounded-xl border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input
                      name="email" type="email" required value={formData.email} onChange={handleChange}
                      className="appearance-none block w-full px-4 py-2 rounded-xl border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="name@company.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input
                      name="phone" type="tel" required value={formData.phone} onChange={handleChange}
                      className={`appearance-none block w-full px-4 py-2 rounded-xl border ${errors.phone ? 'border-red-300' : 'border-slate-300'} placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      placeholder="+1 (555) 000-0000"
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Business Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                      <input
                        name="businessName" type="text" required value={formData.businessName} onChange={handleChange}
                        className={`appearance-none block w-full px-4 py-2 rounded-xl border ${errors.name ? 'border-red-300' : 'border-slate-300'} placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                        placeholder="Acme Corp"
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                      <input
                        name="gstNumber" type="text" required value={formData.gstNumber} onChange={handleChange}
                        className={`appearance-none block w-full px-4 py-2 rounded-xl border ${errors.gstNumber ? 'border-red-300' : 'border-slate-300'} placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                        placeholder="22AAAAA0000A1Z5"
                      />
                      {errors.gstNumber && <p className="mt-1 text-sm text-red-600">{errors.gstNumber}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
                    <textarea
                      name="address" required value={formData.address} onChange={handleChange} rows="2"
                      className={`appearance-none block w-full px-4 py-2 rounded-xl border ${errors.address ? 'border-red-300' : 'border-slate-300'} placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none`}
                      placeholder="123 Commerce St, Suite 100..."
                    />
                    {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                  </div>
                </div>
              </div>

              {/* Security Details */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Security</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input
                      name="password" type="password" required value={formData.password} onChange={handleChange}
                      className="appearance-none block w-full px-4 py-2 rounded-xl border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                    <input
                      name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange}
                      className="appearance-none block w-full px-4 py-2 rounded-xl border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;