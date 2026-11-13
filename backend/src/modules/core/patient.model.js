const mongoose = require('mongoose');
const { Schema } = mongoose;

const patientSchema = new Schema({
    patientId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    sex: { type: String, enum: ['Male', 'Female'], required: true },
    civilStatus: { type: String, enum: ['Single', 'Married', 'Widowed', 'Separated'] },
    address: { type: String },
    city: { type: String },
    contactNo: { type: String },
    email: { type: String },
    emergencyContact: {
        name: { type: String },
        relationship: { type: String },
        contactNo: { type: String } // Using contactNo for consistency
    },
    medical: {
        bloodType: { type: String },
        heightCm: { type: Number },
        weightKg: { type: Number },
        allergies: { type: String },
        conditions: { type: String },
        medications: { type: String },
        surgeries: { type: String },
        smoker: { type: Boolean, default: false }
    },
    insurance: {
        provider: { type: String },
        memberNo: { type: String }
    }
}, { timestamps: true, collection: 'patients' });

module.exports = mongoose.models.Patient || mongoose.model('Patient', patientSchema);