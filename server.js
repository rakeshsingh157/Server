const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const admin = require('firebase-admin'); // Firebase Admin SDK for token verification
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-admin-sdk.json'); // Firebase Service Account JSON
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = 'mongodb+srv://kumarpatelrakesh222:5rqdGjk2vBtKdVob@uploads.tc9np.mongodb.net/?retryWrites=true&w=majority&appName=uploads';

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ Could not connect to MongoDB', err));

// Define File Schema with userId
const fileSchema = new mongoose.Schema({
  userId: String,  // Firebase UID of the user
  filename: String,
  data: Buffer,
  contentType: String,
  uploadDate: { type: Date, default: Date.now }
});

const File = mongoose.model('File', fileSchema);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to verify Firebase Token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).send('Unauthorized: No token provided');
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach user info to request
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(403).send('Unauthorized: Invalid token');
  }
};

// Upload File (Only for Authenticated Users)
app.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const newFile = new File({
      userId: req.user.uid, // Assign file to logged-in user
      filename: req.file.originalname,
      data: req.file.buffer,
      contentType: req.file.mimetype
    });

    await newFile.save();
    res.status(200).send('File uploaded successfully!');
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Failed to upload file.');
  }
});

// Get User's Files
app.get('/files', verifyToken, async (req, res) => {
  try {
    const userFiles = await File.find({ userId: req.user.uid });
    res.status(200).json(userFiles);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).send('Failed to fetch files.');
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
