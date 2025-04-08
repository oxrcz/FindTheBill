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

// API endpoint to get bill details
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
    const billValue = await new Promise((resolve, reject) => {
      db.get('SELECT bill_value FROM valid_bills WHERE serial_number = ?', [serialNumber], (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.bill_value : null);
      });
    });

    const rows = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM tracked_bills WHERE serial_number = ? ORDER BY timestamp DESC',
        [serialNumber],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (rows.length > 0) {
      const geocoder = require('node-geocoder')({
        provider: 'openstreetmap'
      });

      const trackedHistory = await Promise.all(rows.map(async (row) => {
        try {
          const geoData = await geocoder.geocode(`${row.city}, ${row.state}`);
          if (geoData && geoData[0]) {
            return {
              ...row,
              lat: geoData[0].latitude,
              lng: geoData[0].longitude
            };
          }
          return row;
        } catch (error) {
          console.error('Geocoding error:', error);
          return row;
        }
      }));

      res.json({
        trackedHistory,
        trackedCount: rows.length,
        billValue
      });
    } else {
      res.status(404).json({ error: 'Bill not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Endpoint to track a bill
app.post('/api/track-bill', (req, res) => {
  const { serialNumber, city, state, date } = req.body;

  if (!serialNumber || !city || !state || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // First check if it's a valid bill
  db.get('SELECT * FROM valid_bills WHERE serial_number = ?', [serialNumber], (err, validBill) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!validBill) {
      console.log('Invalid bill attempt:', serialNumber);
      console.log('Valid bills in database:', validBill);
      return res.status(400).json({ error: 'This bill serial number is not registered in our system. Please make sure the bill has FindTheBill.net written on it.' });
    }

    // Check cooldown (5 minutes)
    db.get(
      'SELECT timestamp FROM tracked_bills WHERE serial_number = ? ORDER BY timestamp DESC LIMIT 1',
      [serialNumber],
      (err, lastTracked) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const now = new Date();
        if (lastTracked) {
          const lastTrackedTime = new Date(lastTracked.timestamp);
          const minutesSinceLastTrack = (now - lastTrackedTime) / (1000 * 60);

          if (minutesSinceLastTrack < 5) {
            const minutesRemaining = Math.ceil(5 - minutesSinceLastTrack);
            return res.status(429).json({ 
              error: `Please wait ${minutesRemaining} minutes before tracking this bill again` 
            });
          }
        }

        // Insert new tracking entry
        const timestamp = new Date().toISOString();
        db.run(
          'INSERT INTO tracked_bills (serial_number, city, state, date, timestamp) VALUES (?, ?, ?, ?, ?)',
          [serialNumber, city, state, date, timestamp],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error tracking bill' });
            }
            res.json({ message: 'Bill tracked successfully', redirect: `/bill/${serialNumber}` });
          }
        );
      }
    );
  });
});

// API endpoints for most tracked bills and cities
app.get('/api/most_tracked_bills', (req, res) => {
  db.all(`
    SELECT serial_number, COUNT(*) as tracked_count 
    FROM tracked_bills 
    GROUP BY serial_number 
    ORDER BY tracked_count DESC 
    LIMIT 10
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.get('/api/most_tracked_cities', (req, res) => {
  db.all(`
    SELECT city, state, COUNT(*) as tracked_count 
    FROM tracked_bills 
    GROUP BY city, state 
    ORDER BY tracked_count DESC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.get('/api/get-location', async (req, res) => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
    const cleanIp = ip.replace('::ffff:', '');
    
    const response = await axios.get(`https://ipinfo.io/${cleanIp}/json`);
    const data = response.data;
    
    if (data.city && data.region) {
      res.json({
        city: data.city,
        state: data.region
      });
    } else {
      console.log('Could not detect location for IP:', cleanIp);
      res.status(500).json({
        error: 'Could not detect location'
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
