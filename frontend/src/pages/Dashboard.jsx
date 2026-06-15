import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { Users, CreditCard, Activity, Star, AlertCircle, Check, History, X, Search } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, pendingPayments: 0, activeNow: 0, premiumUsers: 0, expiredUsers: 0 });
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', parentPhone: '', isPremium: false, subscriptionEndDate: '' });
  
  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAttendance, setFilterAttendance] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('https://library-backend-1fhf.onrender.com/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allUsers = res.data.users || [];
        setUsers(allUsers);
        
        setStats({
          totalUsers: allUsers.length,
          pendingPayments: allUsers.filter(u => u.status === 'pending_payment').length,
          activeNow: allUsers.filter(u => u.isPresent).length,
          premiumUsers: allUsers.filter(u => u.isPremium).length,
          expiredUsers: allUsers.filter(u => new Date(u.subscriptionEndDate) < new Date()).length
        });
      } catch (error) {
        console.error("Failed to load dashboard", error);
      }
    };
    
    fetchData();

    const libraryId = localStorage.getItem('libraryId');
    const socket = io('https://library-backend-1fhf.onrender.com');
    if (libraryId) {
      socket.on(`attendanceUpdate_${libraryId}`, () => {
        console.log('Real-time attendance update received');
        fetchData();
      });
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  const openEditModal = (user) => {
    setEditingUserId(user._id);
    setFormData({ 
      name: user.name, 
      phone: user.phone, 
      parentPhone: user.parentPhone || '', 
      isPremium: user.isPremium || false,
      subscriptionEndDate: new Date(user.subscriptionEndDate).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleViewHistory = async (userId) => {
    try {
      const res = await axios.get(`https://library-backend-1fhf.onrender.com/api/admin/users/${userId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedUserHistory(res.data);
      setShowHistoryModal(true);
    } catch (err) {
      toast.error('Failed to load user history');
    }
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`https://library-backend-1fhf.onrender.com/api/admin/users/${editingUserId}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Member updated successfully');
      setShowModal(false);
      // Re-fetch data
      const res = await axios.get('https://library-backend-1fhf.onrender.com/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      const allUsers = res.data.users || [];
      setUsers(allUsers);
      setStats({
        totalUsers: allUsers.length,
        pendingPayments: allUsers.filter(u => u.status === 'pending_payment').length,
        activeNow: allUsers.filter(u => u.isPresent).length,
        premiumUsers: allUsers.filter(u => u.isPremium).length,
        expiredUsers: allUsers.filter(u => new Date(u.subscriptionEndDate) < new Date()).length
      });
    } catch (err) {
      toast.error('Failed to update member');
    }
  };

  const cards = [
    { title: 'Total Members',     value: stats.totalUsers,      icon: Users,       gradient: 'from-blue-500 to-blue-600',      bg: 'bg-blue-50 dark:bg-blue-950/40'    },
    { title: 'Active in Library', value: stats.activeNow,       icon: Activity,    gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { title: 'Premium Users',     value: stats.premiumUsers,    icon: Star,        gradient: 'from-amber-500 to-amber-600',    bg: 'bg-amber-50 dark:bg-amber-950/40'   },
    { title: 'Expired Plans',     value: stats.expiredUsers,    icon: AlertCircle, gradient: 'from-orange-500 to-orange-600',  bg: 'bg-orange-50 dark:bg-orange-950/40'  },
    { title: 'Pending Payments',  value: stats.pendingPayments, icon: CreditCard,  gradient: 'from-rose-500 to-rose-600',      bg: 'bg-rose-50 dark:bg-rose-950/40'    },
  ];

  const getFilteredAndSortedUsers = () => {
    let result = [...users];
    
    // 1. Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.phone.includes(q));
    }

    // 2. Filter by Status
    if (filterStatus !== 'all') {
      if (filterStatus === 'expired') {
        const today = new Date();
        today.setHours(0,0,0,0);
        result = result.filter(u => new Date(u.subscriptionEndDate) < today);
      } else {
        result = result.filter(u => u.status === filterStatus);
      }
    }

    // 3. Filter by Attendance
    if (filterAttendance !== 'all') {
      result = result.filter(u => filterAttendance === 'present' ? u.isPresent : !u.isPresent);
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now());
      if (sortOrder === 'oldest') return new Date(a.createdAt || Date.now()) - new Date(b.createdAt || Date.now());
      if (sortOrder === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  };

  const filteredUsers = getFilteredAndSortedUsers();

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {cards.map((card, i) => (
          <div key={i} className={`${card.bg} rounded-2xl p-6 border border-white/60 dark:border-slate-700/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} text-white flex items-center justify-center mb-4 shadow-md`}>
              <card.icon size={22} />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Manage Members</h3>
        
        <div className="mb-6 p-4 border border-slate-100 dark:border-slate-700 rounded-xl flex flex-col xl:flex-row gap-4 bg-slate-50 dark:bg-slate-800/50 items-center justify-between">
          <div className="relative flex-1 w-full xl:w-auto min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
          <div className="flex flex-wrap gap-3 w-full xl:w-auto">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-2.5 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm flex-1 min-w-[130px]">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="expired">Expired</option>
            </select>
            <select value={filterAttendance} onChange={e => setFilterAttendance(e.target.value)} className="p-2.5 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm flex-1 min-w-[130px]">
              <option value="all">All Attendance</option>
              <option value="present">Present Today</option>
              <option value="absent">Absent Today</option>
            </select>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="p-2.5 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm flex-1 min-w-[130px]">
              <option value="newest">Newest Members</option>
              <option value="oldest">Oldest Members</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Presence</th>
                  <th className="px-4 py-3 font-semibold">Time Today</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Valid Till</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Search className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No members found</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={user._id} className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}>
                  <td className="px-4 py-3.5 text-slate-800 dark:text-white font-medium whitespace-nowrap">
                    {user.name}
                    {user.isPremium && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Premium</span>}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{user.phone}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                      user.isPresent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {user.isPresent && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      )}
                      {user.isPresent ? 'Present' : 'Absent'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-medium">{user.todayMinutes} mins</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                      user.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                      user.status === 'pending_payment' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        user.status === 'active' ? 'bg-emerald-500 dark:bg-emerald-400' :
                        user.status === 'pending_payment' ? 'bg-red-500 dark:bg-red-400' : 'bg-slate-400 dark:bg-slate-500'
                      }`} />
                      {user.status === 'active' ? 'Active' :
                       user.status === 'pending_payment' ? 'Pending' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{new Date(user.subscriptionEndDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleViewHistory(user._id)}
                        className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1"
                        title="View History"
                      >
                        <History size={15} /> History
                      </button>
                      <button 
                        onClick={() => openEditModal(user)}
                        className="text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors inline-flex items-center"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Edit Member</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Update member details</p>
            </div>
            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input required type="text" className="w-full border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">User Phone</label>
                <input required type="text" className="w-full border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valid Till</label>
                <input type="date" className="w-full border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={formData.subscriptionEndDate} onChange={e => setFormData({...formData, subscriptionEndDate: e.target.value})} />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="premium" checked={formData.isPremium} onChange={e => setFormData({...formData, isPremium: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                <label htmlFor="premium" className="text-sm font-medium text-slate-700 dark:text-slate-300">Premium Member</label>
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 dark:border-slate-600 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedUserHistory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{selectedUserHistory.user.name}'s History</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedUserHistory.user.phone}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              <div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white border-b dark:border-slate-700 pb-2 mb-4">Payment History</h4>
                {selectedUserHistory.payments.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No payment records found.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedUserHistory.payments.map(p => (
                      <div key={p._id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white flex items-center">
                            ₹{p.amount}
                            {p.screenshotUrl && (
                              <button 
                                onClick={() => setSelectedImage(`https://library-backend-1fhf.onrender.com${p.screenshotUrl}`)}
                                className="ml-3 text-indigo-600 hover:text-indigo-800 text-xs font-medium underline flex items-center"
                              >
                                View Screenshot
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">UTR: {p.utrNumber}</div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.status === 'verified' ? 'bg-green-100 text-green-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.status.toUpperCase()}
                          </span>
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(p.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white border-b dark:border-slate-700 pb-2 mb-4">Attendance Log</h4>
                {selectedUserHistory.attendance.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No attendance records found.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedUserHistory.attendance.map(a => (
                      <div key={a._id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div>
                          <div className="font-medium text-slate-800 dark:text-white">{new Date(a.date).toLocaleDateString()}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'} to {a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{a.totalMinutes} min</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-2 overflow-hidden" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg z-10"
            >
              <X size={24} />
            </button>
            <img src={selectedImage} alt="Payment Proof" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
