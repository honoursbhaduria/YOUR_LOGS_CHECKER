import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      await apiClient.register(
        formData.username,
        formData.email,
        formData.password,
        formData.password2
      );
      navigate('/login', { 
        state: { message: 'Registration successful! Please login.' } 
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 
                      err.response?.data?.detail || 
                      'Registration failed. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-zinc-900 rounded-lg p-10 border border-zinc-800">
        {/* Header */}
        <div>
          <h2 className="text-center text-2xl font-semibold text-zinc-100">
            Forensic Analysis
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Create your account
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-950 border border-red-900 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-zinc-300 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none block w-full px-3 py-2 bg-zinc-950 border border-zinc-800 placeholder-zinc-600 text-zinc-100 rounded-lg focus:outline-none focus:border-zinc-700 transition-colors text-sm"
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none block w-full px-3 py-2 bg-zinc-950 border border-zinc-800 placeholder-zinc-600 text-zinc-100 rounded-lg focus:outline-none focus:border-zinc-700 transition-colors text-sm"
                placeholder="Enter email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none block w-full px-3 py-2 bg-zinc-950 border border-zinc-800 placeholder-zinc-600 text-zinc-100 rounded-lg focus:outline-none focus:border-zinc-700 transition-colors text-sm"
                placeholder="Enter password (min 8 characters)"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password2" className="block text-sm font-medium text-zinc-300 mb-2">
                Confirm Password
              </label>
              <input
                id="password2"
                name="password2"
                type="password"
                required
                className="appearance-none block w-full px-3 py-2 bg-zinc-950 border border-zinc-800 placeholder-zinc-600 text-zinc-100 rounded-lg focus:outline-none focus:border-zinc-700 transition-colors text-sm"
                  placeholder="Confirm password"
                value={formData.password2}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-zinc-950 bg-zinc-100 hover:bg-zinc-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-zinc-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-zinc-500">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-medium text-zinc-100 hover:text-zinc-300 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-8 border-t border-zinc-800 pt-6">
          <p className="text-xs text-center text-zinc-600">
            Secure registration portal
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
