import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
    },
    walletAddress: {
        type: String,
    },
    credentialId: {
        type: String,
    },
    publicKey: {
        type: String,
    },
    pushSubscriptions: {
        type: [Object],
        default: [],
    },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
