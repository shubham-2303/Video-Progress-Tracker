document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('lectureVideo');
    const uniqueProgressBar = document.getElementById('uniqueProgressBar');
    const uniqueProgressText = document.getElementById('uniqueProgressText');
    const lastPositionText = document.getElementById('lastPositionText');
    
    // Configuration
    const userId = 'user123'; // In production, get from auth system
    const videoId = 'lecture1';
    const MIN_SEGMENT_DURATION = 1; // Minimum seconds to count as watched
    const SAVE_INTERVAL = 5000; // Save progress every 5 seconds
    
    // State variables
    let currentSegment = { start: 0, end: 0 };
    let isTracking = false;
    let saveIntervalId = null;
    let videoDuration = 0;
    let lastSavedProgress = 0;
    
    // Initialize
    initVideoPlayer();
    
    // Event listeners
    video.addEventListener('loadedmetadata', handleVideoLoaded);
    video.addEventListener('play', startTracking);
    video.addEventListener('pause', stopTracking);
    video.addEventListener('seeked', handleSeek);
    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('timeupdate', updateProgress);
    
    // Initialize video player
    function initVideoPlayer() {
      // Load saved progress when page loads
      loadProgress().then(data => {
        if (data.lastPosition > 0) {
          video.currentTime = data.lastPosition;
          updateTimeDisplay(data.lastPosition);
        }
        if (data.totalDuration > 0) {
          videoDuration = data.totalDuration;
        }
        updateProgressDisplay(data.progress || 0);
      });
    }
    
    // Handle video metadata loaded
    function handleVideoLoaded() {
      videoDuration = video.duration;
      // If we didn't get duration from server, use the video's duration
      if (!videoDuration || videoDuration === Infinity) {
        videoDuration = 600; // Fallback to 10 minutes
      }
    }
    
    // Start tracking progress
    function startTracking() {
      if (!isTracking) {
        isTracking = true;
        currentSegment.start = video.currentTime;
        currentSegment.end = video.currentTime;
        
        // Start periodic saving
        saveIntervalId = setInterval(saveCurrentProgress, SAVE_INTERVAL);
      }
    }
    
    // Stop tracking progress
    function stopTracking() {
      if (isTracking) {
        isTracking = false;
        clearInterval(saveIntervalId);
        saveCurrentProgress();
      }
    }
    
    // Handle video ended
    function handleVideoEnd() {
      stopTracking();
      // Ensure the last segment is saved
      currentSegment.end = videoDuration;
      saveCurrentProgress(true);
    }
    
    // Handle seek events
    function handleSeek() {
      if (isTracking) {
        // Only save if we've watched a meaningful segment
        if ((currentSegment.end - currentSegment.start) >= MIN_SEGMENT_DURATION) {
          saveCurrentProgress();
        }
        // Start new segment from current position
        currentSegment.start = video.currentTime;
        currentSegment.end = video.currentTime;
      }
    }
    
    // Update progress during playback
    function updateProgress() {
      if (isTracking) {
        currentSegment.end = video.currentTime;
        
        // Calculate temporary progress for UI
        const currentWatched = calculateCurrentWatchedTime();
        const tempProgress = Math.min(100, (currentWatched / videoDuration) * 100);
        updateProgressDisplay(tempProgress);
      }
      
      // Update current time display
      updateTimeDisplay(video.currentTime);
    }
    
    // Calculate current watched time (including unsaved segment)
    function calculateCurrentWatchedTime() {
      // In a real app, this would come from the server
      // For this demo, we'll simulate it with the current segment
      return currentSegment.end - currentSegment.start;
    }
    
    // Save current progress to server
    async function saveCurrentProgress(force = false) {
      const segmentDuration = currentSegment.end - currentSegment.start;
      
      // Only save if segment is meaningful or we're forcing (like at end)
      if (force || segmentDuration >= MIN_SEGMENT_DURATION) {
        try {
          const response = await fetch(`/api/progress/${userId}/${videoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              start: currentSegment.start,
              end: currentSegment.end,
              currentTime: video.currentTime,
              videoDuration: videoDuration
            })
          });
          
          const data = await response.json();
          lastSavedProgress = data.progress;
          updateProgressDisplay(data.progress);
          
          // Reset segment for next tracking period
          currentSegment.start = video.currentTime;
          currentSegment.end = video.currentTime;
        } catch (err) {
          console.error('Error saving progress:', err);
        }
      }
    }
    
    // Load progress from server
    async function loadProgress() {
      try {
        const response = await fetch(`/api/progress/${userId}/${videoId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
      } catch (err) {
        console.error('Error loading progress:', err);
        return { progress: 0, lastPosition: 0, totalDuration: 0 };
      }
    }
    
    // Update progress display
    function updateProgressDisplay(percent) {
      const roundedPercent = Math.round(percent * 10) / 10; // Round to 1 decimal
      uniqueProgressBar.style.width = `${roundedPercent}%`;
      uniqueProgressText.textContent = `${roundedPercent}%`;
    }
    
    // Update time display
    function updateTimeDisplay(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      lastPositionText.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  });