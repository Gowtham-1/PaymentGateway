import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import paymentRoutes from './routes/paymentRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/social-onboarding')
    .then(() => console.log('Connected to MongoDB: social-onboarding'))
    .catch(err => console.error('MongoDB connection error:', err));

const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for external integration
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('register-user', (userId) => {
        console.log(`User registered: ${userId}`);
        socket.join(userId);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Routes
app.use('/api/payments', paymentRoutes);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
