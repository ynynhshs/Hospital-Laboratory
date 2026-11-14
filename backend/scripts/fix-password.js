require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/modules/core/user.model'); // 👈 Correct path
const { hashPassword } = require('../src/shared/utils/password'); // 👈 Correct hash function

async function resetPassword() {
  try {
    const dbName = process.env.MONGODB_DB_NAME || 'medilink_lab_dev';
    await mongoose.connect(process.env.MONGODB_URI, { dbName: dbName });
    console.log(`Connected to database: ${dbName}...`);

    const newPassword = "admin123"; // Using the default password from the seed script
    const passwordHash = await hashPassword(newPassword);
    
    // Updating the 'admin' user
    const result = await User.updateOne(
      { username: 'admin' }, 
      { $set: { passwordHash: passwordHash } }
    );

    if (result.matchedCount === 0) {
      console.log("❌ User 'admin' not found in database.");
    } else {
      console.log(`✅ Success! Password for 'admin' reset to: ${newPassword}`);
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    mongoose.disconnect();
  }
}

resetPassword();