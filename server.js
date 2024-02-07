const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path'); // Import path module

const port = process.env.PORT || 3000;

const DB_CONNECTION = "mongodb+srv://lufurt:AGml2BCIWAzl0LDF@cluster0.siktfkx.mongodb.net/w2024_comp3133?retryWrites=true&w=majority";

// MongoDB connection
mongoose.connect(DB_CONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Success Mongodb connection');
}).catch(err => {
    console.error('Error Mongodb connection:', err.message);
});

// Middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Serve the home page
app.get('/home', (req, res) => {
    res.sendFile(__dirname + '/home.html');
});

// Redirect '/' route to '/home'
app.get('/', (req, res) => {
    res.redirect('/home');
});

// Redirect '/signup' route to the sign-up page
app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/signup.html');
});

// Redirect '/login' route to the login page
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

// Serve the static HTML files
app.get('/groups', (req, res) => {
    res.sendFile(__dirname + '/groups.html');
});

app.get('/room-selection', (req, res) => {
    res.sendFile(path.join(__dirname, 'room-selection.html'));
});

// MongoDB Models
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true },
    firstname: String,
    lastname: String,
    email: String,
    password: String,
    createdOn: { type: Date, default: Date.now }
}));

const ChatMessage = mongoose.model('ChatMessage', new mongoose.Schema({
    from_user: String,
    room: String,
    message: String,
    date_sent: { type: Date, default: Date.now }
}));

// Routes for signup and login
app.post('/signup', async (req, res) => {
    const { firstName, lastName, age, email, password } = req.body;
    const username = (firstName + lastName).replace(/\s/g, '');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, firstname: firstName, lastname: lastName, password: hashedPassword });
    await user.save();
    res.json({ username, message: 'Registration successful!' });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        res.redirect('/groups');
    } else {
        res.status(401).send('Invalid username or password');
    }
});

// Socket.io communication
io.on('connection', async (socket) => {
    socket.on('join_room', async (data) => {
        socket.join(data.room); // Join the specified room
        console.log(`User with username: ${data.username} and ID: ${socket.id} joined room: ${data.room}`);
        
        // Retrieve previous messages from MongoDB
        const previousMessages = await ChatMessage.find({ room: data.room }).sort({ date_sent: 1 }).limit(50); // Fetch 50 most recent messages
        socket.emit('previous_messages', previousMessages); // Emit previous messages to the newly joined user
        
        socket.to(data.room).emit('user_joined', `${data.username} has joined the room.`);
    });

    // When a user leaves a room
    socket.on('leave_room', (data) => {
        socket.leave(data.room);
        console.log(`User with username: ${data.username} has left the room: ${data.room}`);
        socket.to(data.room).emit('user_left', `${data.username} has left the room.`);
    });

    // When a user sends a message
    socket.on('send_message', async (data) => {
        const message = new ChatMessage({
            from_user: data.from_user,
            room: data.room,
            message: data.message,
            date_sent: new Date()
        });
        await message.save();
        io.in(data.room).emit('receive_message', { message: data.message, from_user: data.from_user });
    });

    // When a user is typing
    socket.on('typing', (data) => {
        socket.to(data.room).emit('user_typing', `${data.username} is typing...`);
    });

});

http.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
