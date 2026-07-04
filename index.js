const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken'); // Required for JWT token operations
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware configuration
app.use(cors({
    origin: ['http://localhost:3000'], // Default Next.js port
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB Connection URI from environment variables
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the MongoDB server
    await client.connect();
    console.log("Successfully connected to MongoDB!");

    // Database and collections setup will go here
    

    // ==========================================
    // Auth APIs (JWT Generation & Logout)
    // ==========================================

    // Generate token when user logs in or registers
    app.post('/jwt', async (req, res) => {
        try {
            const user = req.body;
            // Create the token using jwt.sign(payload, secret, options)
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Send token in an HTTP-only cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // true in production, false in local development
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            })
            .send({ success: true });
        } catch (error) {
            res.status(500).send({ message: 'Internal server error' });
        }
    });

    // Clear token cookie when user logs out
    app.post('/logout', async (req, res) => {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                maxAge: 0 // Immediately expires the cookie
            })
            .send({ success: true });
        } catch (error) {
            res.status(500).send({ message: 'Internal server error' });
        }
    });


    // Test API Route to verify server status
    app.get('/', (req, res) => {
        res.send('StudyNook Server is running...');
    });

  } catch (error) {
    // Log any errors that occur during database connection
    console.error("Database connection error:", error);
  } finally {
    // Ensures that the client will not close when finished
  }
}
run().catch(console.dir);

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});