const express = require('express');
const path = require('path');
const axios = require('axios');
const db = require('./database'); // Added database connection
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/most_tracked_bills', (req, res) => {
  res.sendFile(path.join(__dirname, 'most_tracked_bills.html'));
});

app.get('/most_tracked_cities', (req, res) => {
  res.sendFile(path.join(__dirname, 'most_tracked_cities.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/bill/:serial', (req, res) => {
  res.sendFile(path.join(__dirname, 'bill_details.html'));
});

// API endpoints for bill data


app.get('/api/valid-bill/:serial', async (req, res) => {
  try {
    const bill = await db.getValidBill(req.params.serial);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

app.get('/api/bill/:serial', async (req, res) => {
  const serialNumber = req.params.serial;

  try {
    const validBill = await db.getValidBill(serialNumber);
    if (!validBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const trackedHistory = await db.getBillHistory(serialNumber);
    const lastTracked = await db.getLastTrackedBill(serialNumber);
    
    let cooldownSeconds = 0;
    if (lastTracked) {
      const now = new Date();
      const lastTrackedTime = new Date(lastTracked.timestamp);
      const minutesSinceLastTrack = (now - lastTrackedTime) / (1000 * 60);
      if (minutesSinceLastTrack < 30) {
        cooldownSeconds = Math.ceil((30 - minutesSinceLastTrack) * 60);
      }
    }
    
    if (trackedHistory.length > 0) {
      const geocoder = require('node-geocoder')({
        provider: 'openstreetmap'
      });

      // Add retry logic and better error handling for geocoding
      const enrichedHistory = await Promise.all(trackedHistory.map(async (entry) => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const geoData = await geocoder.geocode(`${entry.city}, ${entry.state}, USA`);
            if (geoData && geoData[0]) {
              return {
                ...entry,
                lat: geoData[0].latitude,
                lng: geoData[0].longitude,
                timestamp: entry.timestamp
              };
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
          } catch (error) {
            console.error(`Geocoding error (attempt ${attempt + 1}/3):`, error.message);
            if (attempt === 2) return entry; // Return original entry after all retries fail
          }
        }
        return entry;
      }));

      // Sort history by timestamp
      enrichedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json({
        trackedHistory: enrichedHistory,
        trackedCount: trackedHistory.length,
        billValue: validBill.bill_value,
        cooldownSeconds: cooldownSeconds
      });
    } else {
      res.status(404).json({ error: 'Bill not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Endpoint to track a bill
app.post('/api/track-bill', async (req, res) => {
  const { serialNumber, city, state, date } = req.body;

  if (!serialNumber || !city || !state || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // First check if it's a valid bill
    const validBill = await db.getValidBill(serialNumber);
    
    if (!validBill) {
      console.log('Invalid bill attempt:', serialNumber);
      return res.status(400).json({ error: 'This bill serial number is not registered in our system. Please make sure the bill has FindTheBill.net written on it.' });
    }

    // Check cooldown (30 minutes)
    const lastTracked = await db.getLastTrackedBill(serialNumber);
    
    const now = new Date();
    let cooldownRemaining = 0;
    
    if (lastTracked) {
      const lastTrackedTime = new Date(lastTracked.timestamp);
      const minutesSinceLastTrack = (now - lastTrackedTime) / (1000 * 60);

      if (minutesSinceLastTrack < 30) {
        cooldownRemaining = Math.ceil(30 - minutesSinceLastTrack);
        // Still redirect to view the bill's history, but don't track it
        return res.json({ 
          message: 'Viewing bill history',
          cooldownSeconds: cooldownRemaining * 60,
          redirect: `/bill/${serialNumber}` 
        });
      }
    }

    // Track the bill if no cooldown
    const trackedBill = await db.trackBill({ serialNumber, city, state, date });
    res.json({ 
      message: 'Bill tracked successfully', 
      cooldownSeconds: 1800, // 30 minutes in seconds
      redirect: `/bill/${serialNumber}` 
    });
  } catch (error) {
    console.error('Error tracking bill:', error);
    res.status(500).json({ error: 'Error tracking bill' });
  }
});

// API endpoints for most tracked bills and cities
app.get('/api/most_tracked_bills', async (req, res) => {
  try {
    const mostTrackedBills = await db.getMostTrackedBills();
    res.json(mostTrackedBills);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/most_tracked_cities', async (req, res) => {
  try {
    const mostTrackedCities = await db.getMostTrackedCities();
    res.json(mostTrackedCities);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Cache for location results
const locationCache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const locationService = require('./location_service');

app.get('/api/get-location', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',').shift().trim() || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress;
    
    const location = await locationService.getLocation(ip);
    res.json(location);
  } catch (error) {
    console.error('Location detection error:', error);
    res.status(500).json({
      error: 'Location detection failed',
      city: "New York",
      state: "New York"
    });
  }
});

const PORT = process.env.PORT || 5000;
// 404 handler - must be placed after all other routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
