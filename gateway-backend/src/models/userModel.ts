import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    name?: string;
    // Add other fields as needed to match the existing database
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String },
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);
