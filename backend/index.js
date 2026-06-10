require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initCronJobs } = require('./whatsapp');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});
app.set('io', io);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    try {
      await mongoose.connection.collection('users').dropIndex('phone_1');
      console.log('Successfully dropped legacy phone_1 index!');
    } catch (e) {
      // Ignore if already dropped
    }
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

app.use('/api', routes);

initCronJobs();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
