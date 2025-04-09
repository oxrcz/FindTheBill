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
    // Get IP from various headers
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
               req.headers['x-real-ip'] || 
               req.headers['x-client-ip'] ||
               req.socket.remoteAddress;
               
    const cleanIp = ip.replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1');
    
    if (cleanIp === '127.0.0.1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
      return res.status(500).json({ error: 'Cannot detect location for local IPs' });
    }
    
    const response = await axios.get(`https://ipapi.co/${cleanIp}/json/`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'FindTheBill.net/2.0'
      }
    });
    
    if (response.data.error) {
      throw new Error(response.data.reason || 'IP lookup failed');
    }
    
    if (response.data.city && response.data.region) {
      res.json({
        city: response.data.city,
        state: response.data.region
      });
    } else {
      console.log('No location data for IP:', cleanIp);
      res.status(500).json({
        error: 'Location data unavailable'
      });
    }
  } catch (error) {
    console.error('Error fetching location:', error.message);
    res.status(500).json({
      error: 'Could not detect location'
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
