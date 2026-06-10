import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MapPin, QrCode, MessageCircle, LogOut } from 'lucide-react';

export default function Settings() {
  const [config, setConfig] = useState({ latitude: '', longitude: '', radiusMeters: 50, upiId: '' });
  const [whatsappStatus, setWhatsappStatus] = useState({ ready: false, qr: '' });
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get('https://library-backend-1fhf.onrender.com/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.config) {
          setConfig(res.data.config);
        }
      } catch (error) {
        console.error("Failed to fetch config");
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    let intervalId;
    const fetchWhatsAppStatus = async () => {
      try {
        const res = await axios.get('https://library-backend-1fhf.onrender.com/api/admin/whatsapp/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWhatsappStatus(res.data);
      } catch (error) {
        console.error("Failed to fetch WhatsApp status");
      }
    };

    fetchWhatsAppStatus();
    intervalId = setInterval(fetchWhatsAppStatus, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://library-backend-1fhf.onrender.com/api/admin/config', config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.loading("Fetching location...", { id: "loc" });
    navigator.geolocation.getCurrentPosition((position) => {
      setConfig({
        ...config,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      toast.success("Location acquired", { id: "loc" });
    }, (error) => {
      if (error.code === 2) {
        toast.loading("Hardware GPS failed. Fetching IP location...", { id: "loc" });
        axios.get('https://ipapi.co/json/')
          .then(res => {
            setConfig({
              ...config,
              latitude: res.data.latitude,
              longitude: res.data.longitude
            });
            toast.success("Location acquired via IP fallback.", { id: "loc" });
          })
          .catch(() => {
            toast.error("IP fallback failed. Used default coordinates.", { id: "loc" });
            setConfig({ ...config, latitude: 28.6139, longitude: 77.2090 });
          });
        return;
      }

      let msg = "Unable to retrieve location.";
      if (error.code === 1) msg = "Permission denied. Enable Location Services in Mac System Settings.";
      if (error.code === 3) msg = "Location request timed out.";
      toast.error(msg, { id: "loc" });
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const handleWhatsAppLogout = async () => {
    try {
      await axios.post('https://library-backend-1fhf.onrender.com/api/admin/whatsapp/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Disconnected from WhatsApp. A new QR will be generated.");
      setWhatsappStatus({ ready: false, qr: '' });
    } catch (err) {
      toast.error("Failed to disconnect");
    }
  };

  const handleWhatsAppReset = async () => {
    try {
      await axios.post('https://library-backend-1fhf.onrender.com/api/admin/whatsapp/reset', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Server is restarting to clear WhatsApp session. Please wait 10 seconds and refresh the page.");
      setWhatsappStatus({ ready: false, qr: '' });
    } catch (err) {
      toast.error("Failed to reset");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Library Settings</h2>
      
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 space-y-8">
        
        {/* WhatsApp Integration */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-lg border-b pb-2">
            <MessageCircle size={24} /> <span>WhatsApp Automation</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">Connect your WhatsApp number to automatically send attendance reports and payment reminders.</p>
          
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-3">
              <h4 className="font-bold text-slate-800 text-lg">Connection Status</h4>
              {whatsappStatus.ready ? (
                <div className="space-y-4">
                  <div className="inline-flex items-center text-green-700 bg-green-100 px-3 py-1.5 rounded-full font-bold text-sm shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                    Connected & Ready to Send
                  </div>
                  <p className="text-sm text-slate-600">Your number is linked. Automated messages will be sent from this account.</p>
                  <button type="button" onClick={handleWhatsAppLogout} className="text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center">
                    <LogOut size={16} className="mr-2" /> Disconnect Number
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="inline-flex items-center text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full font-bold text-sm shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></div>
                    Waiting for Scan...
                  </div>
                  <ul className="text-sm text-slate-600 list-decimal pl-4 space-y-1 mt-2">
                    <li>Open WhatsApp on your phone</li>
                    <li>Tap Menu ⋮ or Settings ⚙️</li>
                    <li>Tap <b>Linked Devices</b></li>
                    <li>Tap <b>Link a Device</b> and point your phone at the QR code</li>
                  </ul>
                </div>
              )}
            </div>
            
            {!whatsappStatus.ready && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-48 h-48 bg-white border-2 border-dashed border-indigo-200 rounded-2xl flex items-center justify-center p-2 shadow-sm overflow-hidden shrink-0">
                  {whatsappStatus.qr ? (
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(whatsappStatus.qr)}&size=200x200`} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-slate-400 text-sm text-center font-medium animate-pulse">Generating<br/>QR Code...</div>
                  )}
                </div>
                {!whatsappStatus.qr && (
                  <button type="button" onClick={handleWhatsAppReset} className="text-xs text-red-500 hover:text-red-700 underline font-medium">
                    Stuck? Force Reset Connection
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Geofencing Settings */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-lg border-b pb-2">
            <MapPin size={24} /> <span>Geofencing & Location</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">Set the physical coordinates of your library to allow user check-ins.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
              <input type="number" step="any" value={config.latitude} onChange={e => setConfig({...config, latitude: e.target.value})} className="w-full border rounded-lg p-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
              <input type="number" step="any" value={config.longitude} onChange={e => setConfig({...config, longitude: e.target.value})} className="w-full border rounded-lg p-2" required />
            </div>
          </div>
          
          <div className="flex space-x-4 pt-2">
            <button type="button" onClick={handleGetLocation} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors">
              Use My Current Location
            </button>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Allowed Radius (meters)</label>
            <input type="number" value={config.radiusMeters} onChange={e => setConfig({...config, radiusMeters: e.target.value})} className="w-full md:w-1/2 border rounded-lg p-2" required />
            <p className="text-xs text-slate-500 mt-1">Users must be within this distance to check in.</p>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-lg border-b pb-2">
            <QrCode size={24} /> <span>Payment Configuration</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">This UPI ID will be sent to users in payment reminders.</p>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">UPI ID</label>
            <input type="text" value={config.upiId} onChange={e => setConfig({...config, upiId: e.target.value})} placeholder="example@upi" className="w-full md:w-1/2 border rounded-lg p-2" />
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
