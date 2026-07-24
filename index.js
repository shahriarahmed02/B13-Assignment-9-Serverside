const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware configuration
app.use(cors({
    origin: ['http://localhost:3000'], // Next.js Frontend URL
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Custom Middleware to verify JWT Token
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access' });
        }
        req.user = decoded;
        next();
    });
};

// MongoDB Connection URI
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
    // Connect to MongoDB
    await client.connect();
    console.log("Successfully connected to MongoDB!");

    const db = client.db('studynookDB');
    const roomsCollection = db.collection('rooms');
    const bookingsCollection = db.collection('bookings');

    // ==========================================
    // Auth APIs (JWT Generation & Logout)
    // ==========================================

    app.post('/jwt', async (req, res) => {
        try {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            })
            .send({ success: true });
        } catch (error) {
            res.status(500).send({ message: 'Internal server error' });
        }
    });

    app.post('/logout', async (req, res) => {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 0
            })
            .send({ success: true });
        } catch (error) {
            res.status(500).send({ message: 'Internal server error' });
        }
    });

    // ==========================================
    // 🚪 Rooms APIs
    // ==========================================

    // Get all rooms (supports search & limit)
    app.get('/rooms', async (req, res) => {
        try {
            const search = req.query.search || '';
            const limit = parseInt(req.query.limit) || 0;

            let query = {};
            if (search) {
                query = { name: { $regex: search, $options: 'i' } };
            }

            let cursor = roomsCollection.find(query);
            if (limit > 0) {
                cursor = cursor.limit(limit);
            }

            const result = await cursor.toArray();
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to fetch rooms' });
        }
    });

    // Get single room details by ID
    app.get('/rooms/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await roomsCollection.findOne(query);
            if (!result) {
                return res.status(404).send({ message: 'Room not found' });
            }
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to fetch room details' });
        }
    });

    // Add a new room
    app.post('/rooms', async (req, res) => {
        try {
            const roomData = req.body;
            const result = await roomsCollection.insertOne(roomData);
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to add room' });
        }
    });

    // Get rooms created by current user
    app.get('/my-rooms', async (req, res) => {
        try {
            const email = req.query.email;
            if (!email) {
                return res.status(400).send({ message: 'Email query parameter is required' });
            }
            const query = { ownerEmail: email };
            const result = await roomsCollection.find(query).toArray();
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to fetch user rooms' });
        }
    });

    // Delete a room by ID (ADDED THIS ROUTE)
    app.delete('/rooms/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await roomsCollection.deleteOne(query);
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to delete room' });
        }
    });

    // Update room details by ID
    app.put('/rooms/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedRoom = req.body;
            const updateDoc = {
                $set: {
                    name: updatedRoom.name,
                    floor: updatedRoom.floor,
                    image: updatedRoom.image,
                    capacity: updatedRoom.capacity,
                    hourlyRate: updatedRoom.hourlyRate,
                    description: updatedRoom.description,
                    amenities: updatedRoom.amenities
                }
            };
            const result = await roomsCollection.updateOne(filter, updateDoc);
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to update room' });
        }
    });

    // ==========================================
    // 📅 Bookings APIs
    // ==========================================

    // Create a new booking
    app.post('/bookings', async (req, res) => {
        try {
            const bookingData = req.body;
            const result = await bookingsCollection.insertOne(bookingData);
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to add booking' });
        }
    });

    // Get bookings for logged-in user
    app.get('/my-bookings', async (req, res) => {
        try {
            const email = req.query.email;
            if (!email) {
                return res.status(400).send({ message: 'Email query parameter is required' });
            }
            const query = { userEmail: email };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to fetch bookings' });
        }
    });

    // Cancel / Delete a booking
    app.delete('/bookings/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to delete booking' });
        }
    });

    // Root Test API Route
    app.get('/', (req, res) => {
        res.send('StudyNook Server is running...');
    });

  } catch (error) {
    console.error("Database connection error:", error);
  }
}
run().catch(console.dir);

// Start the server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});