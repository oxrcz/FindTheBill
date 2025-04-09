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

      const enrichedHistory = await Promise.all(trackedHistory.map(async (entry) => {
        try {
          const geoData = await geocoder.geocode(`${entry.city}, ${entry.state}`);
          if (geoData && geoData[0]) {
            return {
              ...entry,
              lat: geoData[0].latitude,
              lng: geoData[0].longitude
            };
          }
          return entry;
        } catch (error) {
          console.error('Geocoding error:', error);
          return entry;
        }
      }));

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

app.get('/api/get-location', async (req, res) => {
  try {
    const NodeGeocoder = require('node-geocoder');
    const geoip = require('geoip-lite');
    
    // Try IP geolocation first
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const geo = geoip.lookup(ip);
    
    if (geo?.city && geo?.region) {
      return res.json({
        city: geo.city,
        state: geo.region
      });
    }

    // Fallback to OpenStreetMap reverse geocoding with a default location (NYC)
    const geocoder = NodeGeocoder({
      provider: 'openstreetmap'
    });

    const results = await geocoder.reverse({ lat: 40.7128, lon: -74.0060 });
    
    if (results?.[0]) {
      const location = results[0];
      return res.json({
        city: location.city || "New York",
        state: location.state || "New York"
      });
    }

    // Final fallback
    res.json({
      city: "New York",
      state: "New York"
    });

  } catch (error) {
    console.error('Location detection error:', error);
    // Fallback to default location instead of error
    res.json({
      city: "New York", 
      state: "New York"
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
