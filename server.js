// server.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Apply express.json() middleware to parse JSON request bodies
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

const Registration = mongoose.model('Registration', new mongoose.Schema({
    username: String,
    email: String,
    password: String, // Note: You can remove this field if you're not storing passwords
    companyCode: String,
    registrationDate: { type: Date, default: Date.now }
}));

const Company = mongoose.model('Company', new mongoose.Schema({
    company_name: String,
    company_code: String
}));

// Endpoint to handle user registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, companyCode } = req.body;

        // Validation for username
        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(username)) {
            return res.status(400).json({ message: "Username must contain at least one letter and one number, and be at least 6 characters long" });
        }

        // Validation for password
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}/.test(password)) {
            return res.status(400).json({ message: "Password must contain at least one lowercase letter, one uppercase letter, one digit, one special character, and be at least 8 characters long" });
        }

        // Check if username or email is already taken
        const existingUser = await Registration.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ message: "Username is already taken" });
            }
            if (existingUser.email === email) {
                return res.status(400).json({ message: "Email is already taken" });
            }
        }

        // Verify company code from MongoDB
        const company = await Company.findOne({ company_code: companyCode });
        if (!company) {
            return res.status(400).json({ message: "Invalid company code" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save registration data to Registration collection
        const registration = new Registration({ username, email, password: hashedPassword, companyCode });
        await registration.save();

        return res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error('Registration failed:', error);
        return res.status(500).json({ message: "Registration failed", error: error.message });
    }
});
// Endpoint to handle user login
app.post('/api/auth/login', async (req, res) => {
  try {
      const { username, password, companyCode } = req.body;

      // Find user by username
      const registration = await Registration.findOne({ username });
      if (!registration) {
          return res.status(400).json({ message: "Username/password combination is wrong" });
      }

      // Verify company code
      if (registration.companyCode !== companyCode) {
          return res.status(400).json({ message: "Invalid company code for this user" });
      }

      // Compare passwords
      const passwordMatch = await bcrypt.compare(password, registration.password);
      if (!passwordMatch) {
          return res.status(400).json({ message: "Username/password combination is wrong" });
      }

      // Generate JWT token
      const payload = { userId: registration._id, username: registration.username }; // Customize payload as needed
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });

      return res.status(200).json({ message: "Login successful", token });
  } catch (error) {
      console.error('Login failed:', error);
      return res.status(500).json({ message: "Login failed", error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
