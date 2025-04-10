const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const progressRoutes = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Adjust for your frontend URL
  optionsSuccessStatus: 200
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/progress', progressRoutes);

// Health check endpoint
app.get('/health', (req, res) => res.send('OK'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// MongoDB connection with updated options
mongoose.connect('mongodb://localhost:27017/videoProgress', {
  useNewUrlParser: true,
  useUnifiedTopology: true
  // Removed unsupported useCreateIndex option
})
.then(() => {
  console.log('MongoDB connected successfully');
  
  // Create indexes after connection
  mongoose.connection.db.collection('progresses').createIndex({ userId: 1, videoId: 1 }, (err) => {
    if (err) {
      console.error('Error creating index:', err);
    } else {
      console.log('Index created successfully');
    }
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit process if DB connection fails
});

// MongoDB event listeners for better debugging
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from DB');
});

// Close Mongoose connection when Node process ends
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Mongoose connection disconnected through app termination');
    process.exit(0);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});