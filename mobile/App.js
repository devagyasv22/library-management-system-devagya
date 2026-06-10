import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Change this to your machine's local IP address when testing on a physical device
const API_URL = 'https://library-backend.onrender.com/api';

export default function App() {
  const [role, setRole] = useState('user');
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [config, setConfig] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!phone) return Alert.alert('Error', 'Please enter your phone number');
    setLoading(true);
    try {
      const endpoint = role === 'admin' ? '/admin/request-otp' : '/user/request-otp';
      await axios.post(`${API_URL}${endpoint}`, { phone });
      setStep('otp');
      Alert.alert('Success', 'OTP sent to your WhatsApp');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!otp) return Alert.alert('Error', 'Please enter the OTP');
    setLoading(true);
    try {
      const endpoint = role === 'admin' ? '/admin/login' : '/user/login';
      const res = await axios.post(`${API_URL}${endpoint}`, { phone, otp });
      setToken(res.data.token);
      if (role === 'admin') {
        setAdminData(res.data.admin);
      } else {
        fetchProfile(res.data.token);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (authToken) => {
    try {
      const res = await axios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${authToken || token}` }
      });
      setUser(res.data.user);
      setConfig(res.data.config);
      setAttendance(res.data.attendance);
    } catch (err) {
      console.log('Profile fetch error', err);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      const res = await axios.post(`${API_URL}/user/attendance/check-in`, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Success', 'Checked In Successfully');
      fetchProfile();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/user/attendance/check-out`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', `Checked out. Total time today: ${res.data.totalMinutes} minutes`);
      fetchProfile();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.card}>
            <View style={styles.roleToggle}>
              <TouchableOpacity style={[styles.roleTab, role === 'user' && styles.roleTabActive]} onPress={() => { setRole('user'); setStep('phone'); }}>
                <Text style={[styles.roleText, role === 'user' && styles.roleTextActive]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.roleTab, role === 'admin' && styles.roleTabActive]} onPress={() => { setRole('admin'); setStep('phone'); }}>
                <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>Admin</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>Library {role === 'admin' ? 'Admin' : 'Student'} App</Text>
            
            {step === 'phone' ? (
              <>
                <Text style={styles.subtitle}>Enter your registered phone number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.button} onPress={handleRequestOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get OTP</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>Enter the OTP sent to your WhatsApp</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                />
                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={{marginTop: 15}} onPress={() => setStep('phone')}>
                  <Text style={{textAlign: 'center', color: '#4f46e5', fontWeight: 'bold'}}>Change Phone Number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (role === 'admin' && adminData) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerStatus}>Welcome back, Admin</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Platform Actions</Text>
            <Text style={styles.infoText}>You are logged in as an administrator. Mobile admin features (scanning QR, viewing live attendance) will be listed here.</Text>
            <Text style={styles.infoText}>For full management, please use the desktop web portal.</Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={() => { setToken(null); setStep('phone'); }}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const isCheckedIn = attendance && attendance.status === 'checked_in';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hi, {user?.name}</Text>
          <Text style={styles.headerStatus}>
            Plan: {user?.isPremium ? 'Premium' : 'Standard'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Attendance Dashboard</Text>
          <Text style={styles.infoText}>
            Status: <Text style={{fontWeight: 'bold', color: isCheckedIn ? 'green' : 'red'}}>
              {isCheckedIn ? 'Checked In (In Library)' : 'Checked Out'}
            </Text>
          </Text>
          <Text style={styles.infoText}>
            Time Spent Today: <Text style={{fontWeight: 'bold'}}>{attendance?.totalMinutes || 0} mins</Text>
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, isCheckedIn ? styles.buttonDisabled : styles.buttonCheckIn]} 
              onPress={handleCheckIn}
              disabled={loading || isCheckedIn}
            >
              <Text style={styles.buttonText}>Check In</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, !isCheckedIn ? styles.buttonDisabled : styles.buttonCheckOut]} 
              onPress={handleCheckOut}
              disabled={loading || !isCheckedIn}
            >
              <Text style={styles.buttonText}>Check Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription Details</Text>
          <Text style={styles.infoText}>Status: {user?.status}</Text>
          <Text style={styles.infoText}>Valid Till: {user?.subscriptionEndDate ? new Date(user.subscriptionEndDate).toLocaleDateString() : 'N/A'}</Text>
          
          {user?.status === 'pending_payment' && (
            <View style={styles.paymentBox}>
              <Text style={styles.paymentText}>Your subscription is expiring!</Text>
              <Text style={styles.paymentText}>Please pay using UPI: {config?.upiId || 'Admin'}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => { setToken(null); setStep('phone'); }}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerStatus: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginBottom: 24,
    padding: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  roleTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleText: {
    color: '#64748b',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#4f46e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buttonCheckIn: {
    backgroundColor: '#10b981',
  },
  buttonCheckOut: {
    backgroundColor: '#f43f5e',
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  paymentBox: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentText: {
    color: '#92400e',
    fontWeight: '500',
    marginBottom: 4,
  },
  logoutButton: {
    marginTop: 'auto',
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  }
});
