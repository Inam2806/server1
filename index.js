        // server.js
        const express = require('express');
        const mongoose = require('mongoose');
        const bcrypt = require('bcrypt');
        const jwt = require('jsonwebtoken');
        require('dotenv').config();
        const cors = require('cors');
        const app = express();
        const PORT = process.env.PORT || 5000;

        // Apply express.json() middleware to parse JSON request bodies
        app.use(express.json());
        app.use(cors());

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
        const company = await Company.findOne({ company_code: companyCode }).lean(); // Use lean() to optimize query performance
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
        console.error('Registration failed: ', error);
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
                return res.status(400).json({ message: "Username/password/companycode combination is wrong" });
            }

            // Compare passwords
            const passwordMatch = await bcrypt.compare(password, registration.password);
            if (!passwordMatch) {
                return res.status(400).json({ message: "Username/password/companycode combination is wrong" });
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
        function authenticateToken(req, res, next) {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
        if (token == null) {
                return res.sendStatus(401);
            }
            jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
                if (err) {
                    return res.sendStatus(403);
                }
                req.user = user;
                next();
            });
        }
    // Endpoint to handle user profile retrieval
    app.get('/api/auth/profile', authenticateToken, async (req, res) => {
        try {
            const { userId } = req.user;

            // Find user by userId
            const registration = await Registration.findById(userId).lean(); // Use lean() to optimize query performance
            if (!registration) {
                return res.status(400).json({ message: "User not found" });
            }

            // Find company by company code
            const company = await Company.findOne({ company_code: registration.companyCode }).lean(); // Use lean() to optimize query performance
            if (!company) {
                return res.status(400).json({ message: "Company not found" });
            }

            // Return user profile with company name
            const profile = {
                userId: registration._id,
                username: registration.username,
                email: registration.email,
                companyCode: registration.companyCode,
                companyName: company.company_name
            };

            return res.status(200).json({ message: "Profile retrieved successfully", profile });
        } catch (error) {
            console.error('Profile retrieval failed:', error);
            return res.status(500).json({ message: "Profile retrieval failed", error: error.message });
        }
    });
// Create a base mongoose schema
const productSchema = new mongoose.Schema({
    productCode: String,
    status: { type: Number, default: 0 },
  });
  
  // Create a function to generate model discriminators
  const createProductModel = (companyName) => {
    return mongoose.model(companyName, productSchema);
  };
  
  // API endpoint to add a product
  app.post('/api/products/add', async (req, res) => {
    const { companyName, productCode } = req.body;
  
    try {
      // Get or create the model based on companyName
      const Product = createProductModel(companyName);
  
      // Create a new product instance
      const newProduct = new Product({
        productCode,
        status: 0,
      });
  
      // Save the product to the database
      await newProduct.save();
  
      res.status(200).json({ message: 'Product added successfully' });
    } catch (error) {
      console.error('Error adding product:', error);
      res.status(500).json({ error: 'Failed to add product' });
    }
  });
//Retailer part
// Endpoint to handle retailer registration
app.post('/api/auth/retailer_register', async (req, res) => {
    try {
        const { username, email, password, retailerCode } = req.body;

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

        // Verify retailer code from MongoDB
        const retailer = await Retailer.findOne({ retailer_code: retailerCode }).lean(); // Use lean() to optimize query performance
        if (!retailer) {
            return res.status(400).json({ message: "Invalid retailer code" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save registration data to Registration collection
        const registration = new Registration({ username, email, password: hashedPassword, retailerCode });
        await registration.save();

        return res.status(201).json({ message: "Retailer registered successfully" });

    } catch (error) {
        console.error('Retailer registration failed: ', error);
        return res.status(500).json({ message: "Retailer registration failed", error: error.message });
    }
});



app.get('/', (req, res) => {
    res.send('Welcome to the authentication API!');
});
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
