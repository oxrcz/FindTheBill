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

app.get('/api/get-location', async (req, res) => {
  try {
    const NodeGeocoder = require('node-geocoder');
    const geoip = require('geoip-lite');
    
    // Get IP address handling proxies
    const ip = req.headers['x-forwarded-for']?.split(',').shift().trim() || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress;
               
    // Check cache first
    if (locationCache.has(ip)) {
      const cached = locationCache.get(ip);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return res.json(cached.data);
      }
      locationCache.delete(ip);
    }

    // Try ipdata.co with rate limit handling
    try {
      const ipdataResponse = await axios.get(`https://api.ipdata.co/${ip}?api-key=test`, {
        timeout: 3000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (ipdataResponse.data?.city && ipdataResponse.data?.region) {
        const locationData = {
          city: ipdataResponse.data.city,
          state: ipdataResponse.data.region
        };
        locationCache.set(ip, { data: locationData, timestamp: Date.now() });
        return res.json(locationData);
      }
    } catch (ipdataError) {
      console.log('ipdata.co error:', ipdataError.message);
      if (ipdataError.response?.status === 429) {
        console.log('Rate limit reached for ipdata.co');
      }
    }

    // 2. Try ipinfo.io as second option
    try {
      const ipinfoResponse = await axios.get(`https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN}`);
      if (ipinfoResponse.data?.city && ipinfoResponse.data?.region) {
        return res.json({
          city: ipinfoResponse.data.city,
          state: ipinfoResponse.data.region
        });
      }
    } catch (ipinfoError) {
      console.log('ipinfo.io fallback:', ipinfoError.message);
    }
    
    // State abbreviation mapping
    const stateMap = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
      'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
      'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
      'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
      'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
      'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
    };

    // Try geoip-lite as second fallback (faster than geocoding)
    const geo = geoip.lookup(ip);
    if (geo?.city && geo?.region) {
      const locationData = {
        city: geo.city,
        state: stateMap[geo.region] || geo.region
      };
      locationCache.set(ip, { data: locationData, timestamp: Date.now() });
      return res.json(locationData);
    }

    // Try OpenStreetMap as final fallback with error handling
    try {
      const geocoder = NodeGeocoder({
        provider: 'openstreetmap',
        timeout: 5000
      });
      
      // First try to get location from IP
      const geo = geoip.lookup(ip);
      if (geo?.ll) {
        const results = await geocoder.reverse({ lat: geo.ll[0], lon: geo.ll[1] });
        if (results?.[0]) {
          const location = results[0];
          const locationData = {
            city: location.city || geo.city || "New York",
            state: stateMap[location.state] || stateMap[geo.region] || "New York"
          };
          locationCache.set(ip, { data: locationData, timestamp: Date.now() });
          return res.json(locationData);
        }
      }
      
      // Fallback to default coordinates if IP geolocation fails
      const results = await geocoder.reverse({ lat: 40.7128, lon: -74.0060 });
      if (results?.[0]) {
        const location = results[0];
        const locationData = {
          city: location.city || "New York",
          state: stateMap[location.state] || "New York"
        };
        locationCache.set(ip, { data: locationData, timestamp: Date.now() });
        return res.json(locationData);
      }
    } catch (geocoderError) {
      console.log('OpenStreetMap error:', geocoderError.message);
    }

    // Default fallback with cache
    const defaultLocation = {
      city: "New York",
      state: "New York"
    };
    locationCache.set(ip, { data: defaultLocation, timestamp: Date.now() });
    res.json(defaultLocation);

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
