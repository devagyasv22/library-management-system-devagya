import React, { useState, useEffect, createContext, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, ScrollView, Image } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const API_URL = 'https://library-backend-1fhf.onrender.com/api';
const AuthContext = createContext();

const Tab = createBottomTabNavigator();

// --- AUTH SCREEN ---
const AuthScreen = () => {
  const { login } = useContext(AuthContext);
  const [role, setRole] = useState('user');
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!phone) return Alert.alert('Error', 'Please enter phone number');
    setLoading(true);
    try {
      const endpoint = role === 'admin' ? '/admin/request-otp' : '/user/request-otp';
      await axios.post(`${API_URL}${endpoint}`, { phone });
      setStep('otp');
      Alert.alert('Success', 'OTP sent to your WhatsApp');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleLogin = async () => {
    if (!otp) return Alert.alert('Error', 'Please enter OTP');
    setLoading(true);
    try {
      const endpoint = role === 'admin' ? '/admin/login' : '/user/login';
      const res = await axios.post(`${API_URL}${endpoint}`, { phone, otp });
      login(res.data.token, role, res.data.user || res.data.admin);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
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
            <Text style={styles.subtitle}>Enter registered phone number</Text>
            <TextInput style={styles.input} placeholder="e.g. 9876543210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TouchableOpacity style={styles.button} onPress={handleRequestOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Enter OTP sent to WhatsApp</Text>
            <TextInput style={styles.input} placeholder="1234" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
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
  );
};

// --- USER SCREENS ---
const UserHome = () => {
  const { token, logout, userData } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
      setProfile(res.data.user);
      setAttendance(res.data.attendance);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleCheckInOut = async (action) => {
    setLoading(true);
    try {
      let endpoint = '/user/attendance/check-out';
      let payload = {};
      
      if (action === 'in') {
        endpoint = '/user/attendance/check-in';
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission denied');
        let loc = await Location.getCurrentPositionAsync({});
        payload = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      }

      await axios.post(`${API_URL}${endpoint}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', `Checked ${action} successfully`);
      fetchProfile();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed action');
    } finally { setLoading(false); }
  };

  const isCheckedIn = attendance?.status === 'checked_in';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hi, {profile?.name || userData?.name}</Text>
        <Text style={styles.headerStatus}>Plan: {profile?.isPremium ? 'Premium' : 'Standard'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Attendance Dashboard</Text>
        <Text style={styles.infoText}>Status: <Text style={{color: isCheckedIn ? 'green' : 'red', fontWeight: 'bold'}}>{isCheckedIn ? 'In Library' : 'Checked Out'}</Text></Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionButton, isCheckedIn ? styles.buttonDisabled : styles.buttonCheckIn]} onPress={() => handleCheckInOut('in')} disabled={loading || isCheckedIn}>
            <Text style={styles.buttonText}>Check In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, !isCheckedIn ? styles.buttonDisabled : styles.buttonCheckOut]} onPress={() => handleCheckInOut('out')} disabled={loading || !isCheckedIn}>
            <Text style={styles.buttonText}>Check Out</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription</Text>
        <Text style={styles.infoText}>Status: {profile?.status}</Text>
        <Text style={styles.infoText}>Valid Till: {profile?.subscriptionEndDate ? new Date(profile.subscriptionEndDate).toLocaleDateString() : 'N/A'}</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
    </SafeAreaView>
  );
};

const UserPayments = () => {
  const { token } = useContext(AuthContext);
  const [image, setImage] = useState(null);
  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const handleUpload = async () => {
    if (!image || !utr) return Alert.alert('Error', 'Image and UTR are required');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('utrNumber', utr);
      formData.append('paymentProof', { uri: image.uri, name: 'proof.jpg', type: 'image/jpeg' });
      await axios.post(`${API_URL}/user/payments`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      Alert.alert('Success', 'Payment uploaded for admin verification');
      setImage(null); setUtr('');
    } catch (err) { Alert.alert('Error', 'Failed to upload'); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Upload Payment</Text>
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="UTR / Transaction ID" value={utr} onChangeText={setUtr} />
        <TouchableOpacity style={styles.button} onPress={pickImage}><Text style={styles.buttonText}>Select Screenshot</Text></TouchableOpacity>
        {image && <Image source={{ uri: image.uri }} style={{ width: '100%', height: 200, marginTop: 10, borderRadius: 10 }} />}
        <TouchableOpacity style={[styles.button, {marginTop: 10, backgroundColor: '#10b981'}]} onPress={handleUpload} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Payment</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- ADMIN SCREENS ---
const AdminHome = () => {
  const { token, logout } = useContext(AuthContext);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setDashboard(res.data)).catch(console.log);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Admin Dashboard</Text>
      <View style={styles.actionRow}>
        <View style={styles.statBox}><Text style={styles.statNum}>{dashboard?.totalUsers || 0}</Text><Text style={styles.statLabel}>Users</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>{dashboard?.activeUsers || 0}</Text><Text style={styles.statLabel}>Active</Text></View>
      </View>
      <ScrollView style={{ marginTop: 20 }}>
        <Text style={styles.cardTitle}>Recent Members</Text>
        {dashboard?.users?.slice(0, 10).map(u => (
          <View key={u._id} style={styles.card}>
            <Text style={{fontWeight: 'bold', fontSize: 16}}>{u.name}</Text>
            <Text style={{color: '#64748b'}}>{u.phone} | Status: {u.status}</Text>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
    </SafeAreaView>
  );
};

const AdminPayments = () => {
  const { token } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/payments/pending`, { headers: { Authorization: `Bearer ${token}` } });
      setPayments(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchPayments(); }, []);

  const verifyPayment = async (id, action) => {
    try {
      await axios.post(`${API_URL}/admin/payments/${id}/verify`, { action }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', `Payment ${action}d`);
      fetchPayments();
    } catch (err) { Alert.alert('Error', 'Failed to verify'); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Pending Payments</Text>
      <FlatList
        data={payments}
        keyExtractor={item => item._id}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={{fontWeight: 'bold'}}>User: {item.userId?.name}</Text>
            <Text>UTR: {item.utrNumber}</Text>
            <Image source={{ uri: `https://library-backend-1fhf.onrender.com${item.screenshotUrl}` }} style={{ width: '100%', height: 150, marginVertical: 10, borderRadius: 8 }} resizeMode="cover" />
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, styles.buttonCheckIn]} onPress={() => verifyPayment(item._id, 'approve')}><Text style={styles.buttonText}>Approve</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.buttonCheckOut]} onPress={() => verifyPayment(item._id, 'reject')}><Text style={styles.buttonText}>Reject</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const AdminSettings = () => {
  const { token } = useContext(AuthContext);
  const [status, setStatus] = useState({});

  useEffect(() => {
    axios.get(`${API_URL}/admin/whatsapp/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setStatus(res.data)).catch(console.log);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Settings</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>WhatsApp Status</Text>
        <Text style={styles.infoText}>Connection: <Text style={{fontWeight: 'bold', color: status.ready ? 'green' : 'red'}}>{status.ready ? 'Connected' : 'Disconnected'}</Text></Text>
        {!status.ready && status.qr && (
          <Text style={{color: '#4f46e5', fontWeight: 'bold'}}>Please log into Web Dashboard to scan QR code.</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

// --- APP ROUTER ---
export default function App() {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);

  const login = (jwt, userRole, data) => { setToken(jwt); setRole(userRole); setUserData(data); };
  const logout = () => { setToken(null); setRole(null); setUserData(null); };

  return (
    <AuthContext.Provider value={{ token, role, userData, login, logout }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {!token ? (
            <AuthScreen />
          ) : role === 'admin' ? (
            <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#4f46e5' }}>
              <Tab.Screen name="AdminDashboard" component={AdminHome} options={{ tabBarLabel: 'Dashboard' }} />
              <Tab.Screen name="AdminPayments" component={AdminPayments} options={{ tabBarLabel: 'Payments' }} />
              <Tab.Screen name="AdminSettings" component={AdminSettings} options={{ tabBarLabel: 'Settings' }} />
            </Tab.Navigator>
          ) : (
            <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#4f46e5' }}>
              <Tab.Screen name="UserHome" component={UserHome} options={{ tabBarLabel: 'Home' }} />
              <Tab.Screen name="UserPayments" component={UserPayments} options={{ tabBarLabel: 'Upload Proof' }} />
            </Tab.Navigator>
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 10 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  headerStatus: { fontSize: 16, color: '#64748b', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  roleToggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 24, padding: 4 },
  roleTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  roleTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  roleText: { color: '#64748b', fontWeight: '600' },
  roleTextActive: { color: '#4f46e5' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, backgroundColor: '#f8fafc' },
  button: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  infoText: { fontSize: 16, color: '#475569', marginBottom: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  actionButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  buttonCheckIn: { backgroundColor: '#10b981' },
  buttonCheckOut: { backgroundColor: '#f43f5e' },
  buttonDisabled: { backgroundColor: '#cbd5e1' },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#4f46e5' },
  statLabel: { fontSize: 14, color: '#64748b', marginTop: 4 },
  logoutButton: { marginTop: 20, marginBottom: 40, padding: 16, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' }
});
