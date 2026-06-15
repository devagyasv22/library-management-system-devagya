import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle, XCircle, Eye, IndianRupee } from 'lucide-react';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const token = localStorage.getItem('adminToken');

  const fetchPayments = async () => {
    try {
      const res = await axios.get('https://library-backend-1fhf.onrender.com/api/admin/payments/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(res.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load pending payments');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleVerify = async (id, action) => {
    try {
      await axios.post(`https://library-backend-1fhf.onrender.com/api/admin/payments/${id}/verify`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Payment ${action}ed successfully`);
      fetchPayments();
    } catch (err) {
      toast.error(`Failed to ${action} payment`);
    }
  };

  if (loading) return <div className="p-8 dark:text-slate-400">Loading payments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
          <CreditCard className="mr-3 text-indigo-600 dark:text-indigo-400" /> Payment Verification
        </h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Member</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Amount</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-400">UTR Number</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Date</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No pending payments to verify.
                  </td>
                </tr>
              ) : (
                payments.map(payment => (
                  <tr key={payment._id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-white">{payment.userId?.name || 'Unknown'}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{payment.userId?.phone || ''}</div>
                    </td>
                    <td className="p-4 font-bold text-slate-800 dark:text-white flex items-center">
                      <IndianRupee size={16} className="text-slate-400 dark:text-slate-500 mr-1" /> {payment.amount}
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{payment.utrNumber}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => setSelectedImage(`https://library-backend-1fhf.onrender.com${payment.screenshotUrl}`)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                        title="View Screenshot"
                      >
                        <Eye size={20} />
                      </button>
                      <button 
                        onClick={() => handleVerify(payment._id, 'verify')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors inline-flex items-center dark:text-green-400 dark:hover:bg-green-950/30"
                        title="Verify Payment"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button 
                        onClick={() => handleVerify(payment._id, 'reject')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center dark:text-red-400 dark:hover:bg-red-950/30"
                        title="Reject Payment"
                      >
                        <XCircle size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-2 overflow-hidden" onClick={e => e.stopPropagation()}>
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
