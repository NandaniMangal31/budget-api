require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
(async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI missing');
    const connectUri = uri.includes('/budget-app') ? uri : uri.replace(/\/?$/, '/budget-app');
    await mongoose.connect(connectUri);
    console.log('Connected to', connectUri);
    const users = await User.find().limit(10).select('email name');
    console.log('Users found:', users.length);
    users.forEach((u) => console.log(u.email, '-', u.name));
    const email = 'nandanimangal7@gmail.com';
    const u = await User.findOne({ email });
    console.log('Lookup', email, u ? { id: u._id.toString(), email: u.email, name: u.name } : 'not found');
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
})();
