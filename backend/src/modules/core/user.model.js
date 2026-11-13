const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    employeeId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true }, // lab_admin, requesting_clinician, etc.
    status: { type: String, enum: ['Pending', 'Active', 'Inactive'], default: 'Active' }
}, { timestamps: true, collection: 'users' });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);