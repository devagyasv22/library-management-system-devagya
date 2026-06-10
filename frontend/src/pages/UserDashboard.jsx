import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, LogOut, Clock, Activity, CreditCard, History, Upload, X, CheckCircle, Clock3, XCircle } from 'lucide-react';

export default function UserDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'history'
  const [historyData, setHistoryData] = useState({ attendance: [], payments: [] });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', utrNumber: '', screenshot: null });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('userToken');

  useEffect(() => {
    fetchProfile();
    fetchHistory();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('https://library-backend.onrender.com/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setLoading(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      toast.error(`Failed to load profile: ${msg}`);
      navigate('/user-login');
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get('https://library-backend.onrender.com/api/user/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistoryData(res.data);
    } catch (err) {
      console.error("Failed to fetch history");
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.screenshot) {
      return toast.error("Please select a screenshot to upload.");
    }

    setSubmittingPayment(true);
    const formData = new FormData();
    formData.append('amount', paymentForm.amount);
    formData.append('utrNumber', paymentForm.utrNumber);
    formData.append('screenshot', paymentForm.screenshot);

    try {
      await axios.post('https://library-backend.onrender.com/api/user/payments', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("Payment proof submitted for verification!");
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', utrNumber: '', screenshot: null });
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    toast.loading('Verifying location...', { id: 'gps' });
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        await axios.post('https://library-backend.onrender.com/api/user/attendance/check-in', 
          { latitude, longitude },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Checked in successfully!', { id: 'gps' });
        fetchProfile();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to check in', { id: 'gps' });
      }
    }, async (error) => {
      if (error.code === 2) {
        toast.loading("Hardware GPS failed. Fetching IP location...", { id: 'gps' });
        try {
          const ipRes = await axios.get('https://ipapi.co/json/');
          await axios.post('https://library-backend.onrender.com/api/user/attendance/check-in', 
            { latitude: ipRes.data.latitude, longitude: ipRes.data.longitude },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success('Checked in successfully via IP fallback!', { id: 'gps' });
          fetchProfile();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to check in via IP', { id: 'gps' });
        }
        return;
      }
      
      let msg = "Unable to retrieve location.";
      if (error.code === 1) msg = "Permission denied. Enable Location Services in Mac System Settings.";
      if (error.code === 3) msg = "Location request timed out.";
      toast.error(msg, { id: 'gps' });
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const handleCheckOut = async () => {
    try {
      await axios.post('https://library-backend.onrender.com/api/user/attendance/check-out', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Checked out successfully!');
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to check out');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    navigate('/user-login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  const { user, attendance } = profile;
  const isCheckedIn = attendance && attendance.status === 'checked_in';

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-indigo-600 text-white pt-12 pb-24 px-6 rounded-b-[3rem] shadow-lg relative">
        <button onClick={handleLogout} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
          <LogOut size={20} />
        </button>
        <h1 className="text-3xl font-bold mb-2">Hello, {user.name}!</h1>
        <p className="text-indigo-100 flex items-center">
          <Activity size={16} className="mr-2" />
          {user.isPremium ? 'Premium Member' : 'Standard Member'}
        </p>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-16 space-y-6 relative z-10">
        
        {/* Navigation Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm p-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Activity size={16} className="mr-2" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <History size={16} className="mr-2" /> My History
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <>
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform transition-all hover:-translate-y-1">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${isCheckedIn ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                <Clock size={40} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">
                {isCheckedIn ? 'You are Checked In' : 'Not Checked In'}
              </h2>
              <p className="text-slate-500 mb-8">
                {isCheckedIn ? 'Have a great study session!' : 'Check in to start logging your hours.'}
              </p>

              {isCheckedIn ? (
                <button 
                  onClick={handleCheckOut}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition-colors flex justify-center items-center text-lg"
                >
                  Check Out Now
                </button>
              ) : (
                <button 
                  onClick={handleCheckIn}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors flex justify-center items-center text-lg"
                >
                  <MapPin size={24} className="mr-2" />
                  Check In Here
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">Today's Summary</h3>
              <div className="flex justify-between items-center py-3 border-b border-slate-50">
                <span className="text-slate-500">Time Logged</span>
                <span className="font-bold text-slate-800">{attendance?.totalMinutes || 0} minutes</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-500">Plan Valid Till</span>
                <span className="font-medium text-slate-800">{new Date(user.subscriptionEndDate).toLocaleDateString()}</span>
              </div>
              <button 
                onClick={() => setShowPaymentModal(true)}
                className="mt-4 w-full py-3 bg-slate-50 hover:bg-slate-100 text-indigo-600 font-bold rounded-lg border border-indigo-100 transition-colors flex justify-center items-center"
              >
                <CreditCard size={18} className="mr-2" />
                Submit Payment Proof
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">Fee Payment History</div>
              <div className="divide-y divide-slate-100">
                {historyData.payments.length === 0 ? (
                  <p className="p-6 text-center text-slate-500 text-sm">No payment history found.</p>
                ) : (
                  historyData.payments.map(payment => (
                    <div key={payment._id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center">
                          ₹{payment.amount}
                          {payment.screenshotUrl && (
                            <button 
                              onClick={() => setSelectedImage(`https://library-backend.onrender.com${payment.screenshotUrl}`)}
                              className="ml-3 text-indigo-600 hover:text-indigo-800 text-xs font-medium underline flex items-center"
                            >
                              View Proof
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">UTR: {payment.utrNumber}</div>
                        <div className="text-xs text-slate-400 mt-1">{new Date(payment.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        {payment.status === 'verified' && <span className="flex justify-end items-center text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full"><CheckCircle size={12} className="mr-1"/> Verified</span>}
                        {payment.status === 'pending' && <span className="flex justify-end items-center text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded-full"><Clock3 size={12} className="mr-1"/> Pending</span>}
                        {payment.status === 'rejected' && <span className="flex justify-end items-center text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full"><XCircle size={12} className="mr-1"/> Rejected</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">Recent Attendance</div>
              <div className="divide-y divide-slate-100">
                {historyData.attendance.length === 0 ? (
                  <p className="p-6 text-center text-slate-500 text-sm">No attendance records found.</p>
                ) : (
                  historyData.attendance.map(record => (
                    <div key={record._id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-800">{new Date(record.date).toLocaleDateString()}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          In: {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
                          <span className="mx-2">|</span>
                          Out: {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-indigo-600">{record.totalMinutes} min</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Submit Payment Proof</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              {profile.config?.upiId && (
                <div className="bg-indigo-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-indigo-800 font-medium mb-1">Library UPI ID:</p>
                  <p className="text-lg font-bold text-indigo-900">{profile.config.upiId}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid (₹)</label>
                <input 
                  type="number" 
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  placeholder="e.g. 1000"
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">UTR / Transaction Number</label>
                <input 
                  type="text" 
                  value={paymentForm.utrNumber}
                  onChange={e => setPaymentForm({...paymentForm, utrNumber: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  placeholder="Enter 12-digit UTR number"
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Screenshot</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors bg-slate-50">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 px-2 py-1">
                        <span>Upload a file</span>
                        <input type="file" className="sr-only" accept="image/*" onChange={e => setPaymentForm({...paymentForm, screenshot: e.target.files[0]})} />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">PNG, JPG, WEBP up to 5MB</p>
                    {paymentForm.screenshot && <p className="text-sm font-bold text-indigo-600 mt-2">{paymentForm.screenshot.name}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={submittingPayment}
                  className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50"
                >
                  {submittingPayment ? 'Uploading...' : 'Submit Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full bg-white rounded-xl shadow-2xl p-2 overflow-hidden" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg z-10"
            >
              <XCircle size={24} />
            </button>
            <img src={selectedImage} alt="Payment Proof" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
