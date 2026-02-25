import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CameraIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Settings = () => {
  const { business, updateBusiness, uploadLogo, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({
    name: business?.name || '',
    gstNumber: business?.gstNumber || '',
    address: business?.address || '',
    email: business?.email || '',
    phone: business?.phone || '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size should be less than 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setUploadingLogo(true);
    await uploadLogo(formData);
    setUploadingLogo(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await updateBusiness(formData);
    setLoading(false);
  };

  const validateGST = (gst) => {
    const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return re.test(gst);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Business Settings</h1>
          <p className="text-slate-500 mt-1">Manage your business profile and preferences</p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-3xl overflow-hidden">
        {/* Logo Upload Section */}
        <div className="p-8 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="relative">
              {business?.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt="Business logo"
                  className="h-32 w-32 object-cover rounded-2xl shadow-md border-4 border-white transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="h-32 w-32 bg-slate-200 rounded-2xl shadow-inner flex items-center justify-center border-4 border-white transition-transform group-hover:scale-105">
                  <CameraIcon className="h-10 w-10 text-slate-400" />
                </div>
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-slate-900/50 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <LoadingSpinner size="sm" color="white" />
                </div>
              )}
            </div>
            {/* Hidden Input wrapped by Label */}
            <div className="mt-4 text-center hidden md:block">

            </div>
          </div>
          <div className="flex-1 space-y-3 text-center md:text-left">
            <h2 className="text-xl font-bold text-slate-900">Brand Logo</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Your logo will appear on all generated invoices. We recommend a square PNG image under 2MB.
            </p>
            <label
              htmlFor="logo-upload"
              className="cursor-pointer inline-flex items-center px-5 py-2.5 mt-2 border border-slate-300 rounded-xl shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-95"
            >
              <CameraIcon className="w-4 h-4 mr-2 text-slate-400" />
              Upload New Image
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Business Details Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="block w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter business name"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                GST Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                required
                className={`block w-full px-4 py-3 rounded-xl border ${formData.gstNumber && !validateGST(formData.gstNumber) ? 'border-red-300' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                placeholder="22AAAAA0000A1Z5"
              />
              {formData.gstNumber && !validateGST(formData.gstNumber) && (
                <p className="mt-2 text-xs font-semibold text-red-500">
                  Please enter a valid GST number
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Business Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                rows={3}
                className="block w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Enter complete business address"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="block w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="business@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="block w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="9876543210"
              />
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading || authLoading}
              className="inline-flex justify-center items-center py-3 px-8 rounded-xl shadow-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;