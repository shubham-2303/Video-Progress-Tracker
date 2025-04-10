const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');

// Save or update progress
router.post('/:userId/:videoId', async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const { start, end, currentTime, videoDuration } = req.body;

    // Validate input
    if (start >= end) {
      return res.status(400).json({ message: 'Invalid time segment' });
    }

    let progress = await Progress.findOne({ userId, videoId });

    if (!progress) {
      progress = new Progress({
        userId,
        videoId,
        watchedSegments: [{ start, end }],
        lastPosition: currentTime,
        totalDuration: videoDuration
      });
    } else {
      progress.mergeSegments({ start, end });
      progress.lastPosition = currentTime;
      // Update total duration if needed
      if (videoDuration && progress.totalDuration !== videoDuration) {
        progress.totalDuration = videoDuration;
      }
    }

    await progress.save();
    
    res.json({
      progress: progress.getProgressPercentage(),
      lastPosition: progress.lastPosition
    });
  } catch (err) {
    console.error('Error saving progress:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get progress
router.get('/:userId/:videoId', async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const progress = await Progress.findOne({ userId, videoId });

    if (!progress) {
      return res.json({ 
        progress: 0, 
        lastPosition: 0,
        totalDuration: 0
      });
    }

    res.json({
      progress: progress.getProgressPercentage(),
      lastPosition: progress.lastPosition,
      totalDuration: progress.totalDuration
    });
  } catch (err) {
    console.error('Error loading progress:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;