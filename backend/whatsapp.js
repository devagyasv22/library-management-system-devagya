const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const { addDays } = require('date-fns');
const os = require('os');
const { Library, User, Attendance } = require('./models.js');

const clients = new Map();
const qrCodes = new Map();
const readyStatuses = new Map();
const initializingSet = new Set(); // Prevent double-init

// Helper to initialize client for a specific library
const initializeClient = async (libraryId) => {
    if (clients.has(libraryId) || initializingSet.has(libraryId)) return;
    initializingSet.add(libraryId);

    console.log(`Initializing WhatsApp Client for library: ${libraryId}`);
    
    try {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: libraryId.toString() }), 
            puppeteer: {
                ...(os.platform() === 'darwin' 
                    ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } 
                    : process.env.PUPPETEER_EXECUTABLE_PATH 
                        ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } 
                        : {}),
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox', 
                    '--disable-dev-shm-usage', 
                    '--disable-accelerated-2d-canvas', 
                    '--no-first-run', 
                    '--no-zygote', 
                    '--single-process', 
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--metrics-recording-only',
                    '--mute-audio',
                    '--no-default-browser-check',
                    '--js-flags=--max-old-space-size=128'
                ] 
            }
        });

        readyStatuses.set(libraryId, false);
        qrCodes.set(libraryId, '');
        clients.set(libraryId, client);

        client.on('qr', (qr) => {
            console.log(`[Library ${libraryId}] WhatsApp QR Code generated`);
            qrCodes.set(libraryId, qr);
            readyStatuses.set(libraryId, false);
        });

        client.on('ready', () => {
            console.log(`✅ [Library ${libraryId}] WhatsApp is ready and connected!`);
            readyStatuses.set(libraryId, true);
            qrCodes.set(libraryId, '');
        });

        client.on('disconnected', (reason) => {
            console.log(`[Library ${libraryId}] Client was logged out`, reason);
            readyStatuses.set(libraryId, false);
            qrCodes.set(libraryId, '');
            clients.delete(libraryId);
            initializingSet.delete(libraryId);
        });

        client.on('auth_failure', msg => {
            console.error(`[Library ${libraryId}] Authentication failure:`, msg);
            clients.delete(libraryId);
            initializingSet.delete(libraryId);
        });

        await client.initialize();
    } catch (err) {
        console.error(`[Library ${libraryId}] Failed to initialize WhatsApp:`, err.message);
        clients.delete(libraryId);
        initializingSet.delete(libraryId);
    }
};

// NOTE: Does NOT auto-initialize. Admin must explicitly click "Connect WhatsApp".
const getWhatsAppStatus = (libraryId) => {
    return {
        ready: readyStatuses.get(libraryId) || false,
        qr: qrCodes.get(libraryId) || '',
        initialized: clients.has(libraryId)
    };
};

// Explicit connect - admin clicks "Connect" button
const connectWhatsApp = async (libraryId) => {
    if (!clients.has(libraryId)) {
        await initializeClient(libraryId);
    }
    return getWhatsAppStatus(libraryId);
};

const logoutWhatsApp = async (libraryId) => {
    try {
        const client = clients.get(libraryId);
        if (client && readyStatuses.get(libraryId)) {
            await client.logout();
            await client.destroy();
        }
    } catch (err) {
        console.error(`[Library ${libraryId}] Error logging out`, err);
    }
    readyStatuses.set(libraryId, false);
    qrCodes.set(libraryId, '');
    clients.delete(libraryId);
    initializingSet.delete(libraryId);
};

const sendWhatsAppMessage = async (libraryId, to, message) => {
    // Check if client exists and is ready
    const client = clients.get(libraryId);
    const isReady = readyStatuses.get(libraryId);
    
    if (!client || !isReady) {
        console.log(`[Library ${libraryId} WhatsApp Not Ready] Would have sent to ${to}: ${message}`);
        return;
    }
    
    try {
        let cleanNumber = to.replace(/\D/g, '');
        if (cleanNumber.length === 10) {
            cleanNumber = '91' + cleanNumber;
        }
        
        const chatId = `${cleanNumber}@c.us`;
        await client.sendMessage(chatId, message);
        console.log(`[Library ${libraryId}] WhatsApp message successfully sent to ${to}`);
    } catch (err) {
        console.error(`[Library ${libraryId}] WhatsApp Send Error:`, err.message);
    }
};

const initCronJobs = () => {
  // Check daily at 9:00 AM for users whose subscription expires in 3 days
  cron.schedule('0 9 * * *', async () => {
    console.log("Running Payment Reminder Cron...");
    const threeDaysFromNow = addDays(new Date(), 3);
    
    const users = await User.find({ status: 'active', subscriptionEndDate: { $lt: threeDaysFromNow } }).populate('libraryId');

    for (const user of users) {
      if (user.phone && user.libraryId) {
        const libId = user.libraryId._id.toString();
        const upiInfo = user.libraryId.upiId ? `Please pay using UPI: ${user.libraryId.upiId}` : 'Please contact admin for payment.';
        await sendWhatsAppMessage(
          libId,
          user.phone,
          `Hi ${user.name}, your library subscription at ${user.libraryId.name || 'the library'} is expiring in 3 days. ${upiInfo}`
        );
      }
    }
  });

  // Daily Attendance Report at 9:00 PM
  cron.schedule('0 21 * * *', async () => {
    console.log("Running Daily Attendance Cron...");
    const today = new Date();
    today.setHours(0,0,0,0);
    const attendances = await Attendance.find({
      date: { $gte: today }
    }).populate({
      path: 'userId',
      populate: { path: 'libraryId' }
    });
    
    for (const att of attendances) {
      if (att.userId && att.userId.isPremium && att.userId.parentPhone && att.userId.libraryId) {
        const libId = att.userId.libraryId._id.toString();
        await sendWhatsAppMessage(
          libId,
          att.userId.parentPhone,
          `Daily Report: Your child ${att.userId.name} spent ${att.totalMinutes} minutes at ${att.userId.libraryId.name || 'the library'} today.`
        );
      }
    }
  });

  // Send attendance URL to all registered users daily at 2:18 PM
  cron.schedule('18 14 * * *', async () => {
    console.log("Running Daily Attendance URL Reminder Cron...");
    const allUsers = await User.find().populate('libraryId');
    const attendanceUrl = `http://localhost:5173/user-login`;

    for (const user of allUsers) {
      if (user.phone && user.libraryId) {
        const libId = user.libraryId._id.toString();
        await sendWhatsAppMessage(
          libId,
          user.phone,
          `Hi ${user.name}, please mark your daily attendance for ${user.libraryId.name || 'the library'} using this link: ${attendanceUrl}`
        );
      }
    }
  });
};

module.exports = { sendWhatsAppMessage, initCronJobs, getWhatsAppStatus, logoutWhatsApp, connectWhatsApp };
