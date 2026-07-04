const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000'], // Next.js-এর ডিফল্ট পোর্ট
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB Connection
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
    // Connect the client to the server
    await client.connect();
    console.log("Successfully connected to MongoDB!");

    // database and collections will go here
    
    // Test API
    app.get('/', (req, res) => {
        res.send('StudyNook Server is running...');
    });

  } finally {
    // keeping client open
  }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});