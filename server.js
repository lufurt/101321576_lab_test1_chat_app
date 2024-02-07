require('dotenv').config();

// Modules
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Toutes
const chatRoutes = require('./routes/chat');

// Initialize Express app and create an HTTP server for Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(bodyParser.json());

// Use chat routes for any requests to "/chat"
app.use('/chat', chatRoutes);

// Root route to prevent "Cannot GET /" error
app.get('/', (req, res) => {
    res.send('Welcome to the Chat App!');
});

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Event listener
    socket.on('joinRoom', ({ username, room }) => {
        console.log(`${username} joined room ${room}`);
        
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});