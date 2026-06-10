import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function UserLogin() {
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://library-backend-1fhf.onrender.com/api/user/login', { phone });
      localStorage.setItem('userToken', res.data.token);
      toast.success('Logged in successfully');
      navigate('/user-dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      toast.error(`Login failed: ${msg}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
      <div className="glass p-10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-blue-500"></div>
        <h2 className="text-3xl font-bold text-center text-white mb-8">Member Portal</h2>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Registered Phone Number</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition-all"
              required
            />
          </div>
          <button type="submit" className="w-full py-3 bg-white text-indigo-600 font-bold rounded-lg shadow-lg hover:bg-gray-50 transition-all transform hover:-translate-y-1">
            Login
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-white/70 hover:text-white text-sm transition-colors">
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
