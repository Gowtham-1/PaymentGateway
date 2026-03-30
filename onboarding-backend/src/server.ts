import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import webpush from 'web-push';
import { User } from './models/User.js';
import authRoutes from './routes/auth.js';

dotenv.config();

webpush.setVapidDetails(
    'mailto:contact@example.com',
    'BKNNSpStHajjKeUssPhoHPiJpSpVxu9CjgGhu8Sz_8SzoFE0N7RQPo76-zwQUL-VrCA0Qv3IPpD7LaGijfcl4jg',
    'gte5Gvem3V_7IXmYWF9Dz6PTO0Mvl_eTht27CaQp6n8'
);

const app = express();

// Middleware
app.set('trust proxy', 1); // Trust first proxy (required for secure cookies behind localtunnel)
app.use(cors({
    origin: true, // Allow any origin (reflects request origin)
    credentials: true
}));
app.use(express.json());
// Session Config
app.use(session({
    secret: 'secret_key', // In production, use environment variable
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Allow HTTP for localhost
        sameSite: 'lax' // Same origin
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Database Connection
mongoose.connect(process.env.MONGO_URI || '')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Passport Config
const callbackURL = "/auth/google/callback";
console.log("Configured Google Callback URL:", callbackURL);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: callbackURL
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });
            if (!user) {
                user = await User.create({
                    googleId: profile.id,
                    email: (profile.emails && profile.emails[0]) ? profile.emails[0].value : '',
                    name: profile.displayName,
                    avatar: (profile.photos && profile.photos[0]) ? profile.photos[0].value : ''
                });
            }
            return done(null, user);
        } catch (error) {
            return done(error as any, undefined);
        }
    }
));

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Routes
app.use('/auth', authRoutes);

import userRoutes from './routes/user.js';

// ... (previous code)

// Routes
app.use('/auth', authRoutes);
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
