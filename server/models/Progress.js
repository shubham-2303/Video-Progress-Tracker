const mongoose = require('mongoose');

const watchedSegmentSchema = new mongoose.Schema({
  start: { type: Number, required: true },
  end: { type: Number, required: true }
}, { _id: false });

const progressSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  videoId: { type: String, required: true, index: true },
  watchedSegments: [watchedSegmentSchema],
  lastPosition: { type: Number, default: 0 },
  totalDuration: { type: Number, required: true }
}, { timestamps: true });

// Improved segment merging algorithm
progressSchema.methods.mergeSegments = function(newSegment) {
  let segments = [...this.watchedSegments];
  
  // Only add if segment duration is meaningful (at least 1 second)
  if ((newSegment.end - newSegment.start) >= 1) {
    segments.push(newSegment);
  } else {
    return this;
  }

  // Sort by start time
  segments.sort((a, b) => a.start - b.start);

  const merged = [];
  let current = segments[0];

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    
    // Check for overlapping or adjacent segments
    if (segment.start <= (current.end + 1)) { // +1 allows for small gaps
      current.end = Math.max(current.end, segment.end);
    } else {
      merged.push(current);
      current = segment;
    }
  }
  merged.push(current);

  this.watchedSegments = merged;
  return this;
};

// Calculate total watched time efficiently
progressSchema.methods.calculateWatchedTime = function() {
  return this.watchedSegments.reduce((total, segment) => {
    return total + (segment.end - segment.start);
  }, 0);
};

// Calculate progress percentage
progressSchema.methods.getProgressPercentage = function() {
  const watched = this.calculateWatchedTime();
  return Math.min(100, (watched / this.totalDuration) * 100);
};

module.exports = mongoose.model('Progress', progressSchema);