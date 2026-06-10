import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [libraryName, setLibraryName] = useState('');
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://library-backend-1fhf.onrender.com/api/admin/request-otp', { phone });
      toast.success('OTP sent to WhatsApp');
      setStep(2);
    } catch (err) {
      toast.error('Failed to send OTP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (isLogin) {
        res = await axios.post('https://library-backend-1fhf.onrender.com/api/admin/login', { phone, otp });
      } else {
        res = await axios.post('https://library-backend-1fhf.onrender.com/api/admin/signup', { phone, otp, name, libraryName });
      }
      localStorage.setItem('adminToken', res.data.token);
      if (res.data.libraryId) localStorage.setItem('libraryId', res.data.libraryId);
      if (res.data.library) localStorage.setItem('libraryId', res.data.library._id);
      
      toast.success(isLogin ? 'Logged in successfully' : 'Library registered successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP or error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-yellow-500"></div>
        <h2 className="text-3xl font-bold text-center text-white mb-6">LibPro Platform</h2>
        
        {step === 1 && (
          <div className="flex bg-white/10 rounded-lg p-1 mb-8">
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-white hover:bg-white/10'}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-white hover:bg-white/10'}`}
              onClick={() => setIsLogin(false)}
            >
              Register Library
            </button>
          </div>
        )}
        
        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Your Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Library Name</label>
                  <input type="text" value={libraryName} onChange={(e) => setLibraryName(e.target.value)} placeholder="Central City Library" className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition-all" required />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-white mb-1">WhatsApp Number</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition-all" required />
            </div>
            <button type="submit" className="w-full py-3 mt-4 bg-white text-indigo-600 font-bold rounded-lg shadow-lg hover:bg-gray-50 transition-all transform hover:-translate-y-1">
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Enter OTP (Use 1234 for testing)</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="1234" className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition-all" required />
            </div>
            <button type="submit" className="w-full py-3 bg-white text-indigo-600 font-bold rounded-lg shadow-lg hover:bg-gray-50 transition-all transform hover:-translate-y-1">
              {isLogin ? 'Login' : 'Create Library'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
