const express = require('express');
const path = require('path');
const fs = require('fs');
const geoip = require('geoip-lite');
const app = express();

// Add JSON body parser middleware
app.use(express.json());

function readBillsData() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'bills_data.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading bills data:', error);
    return {};
  }
}

// Serve static files from the current directory
app.use(express.static(__dirname));

// Define a route for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the most tracked bills page
app.get('/most_tracked_bills', (req, res) => {
  res.sendFile(path.join(__dirname, 'most_tracked_bills.html'));
});

// Serve the most tracked cities page
app.get('/most_tracked_cities', (req, res) => {
  res.sendFile(path.join(__dirname, 'most_tracked_cities.html'));
});

// Serve the about page
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

// Serve the bill details page
app.get('/bill/:serial', (req, res) => {
  res.sendFile(path.join(__dirname, 'bill_details.html'));
});

// API endpoint to get bill details
app.get('/api/bill/:serial', (req, res) => {
  const serialNumber = req.params.serial;
  const billsData = readBillsData();
  
  if (billsData[serialNumber]) {
    res.json(billsData[serialNumber]);
  } else {
    res.status(404).json({ error: 'Bill not found' });
  }
});

// Your existing code (e.g., middleware, routes)
app.get('/api/most_tracked_bills', (req, res) => {
    // Your handler code
});

// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please kill any existing node processes and try again.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});

// Helper function to get most tracked bills
function getMostTrackedBills(billsData) {
  const trackedBills = Object.keys(billsData).map(serialNumber => {
    return {
      serialNumber,
      trackedCount: billsData[serialNumber].trackedCount || 0
    };
  });

  trackedBills.sort((a, b) => b.trackedCount - a.trackedCount);
  return trackedBills.slice(0, 10); // Return only top 10
}

// Helper function to get most tracked cities
function getMostTrackedCities(billsData) {
  const cityCount = {};

  Object.values(billsData).forEach(bill => {
    bill.trackedHistory.forEach(entry => {
      const city = entry.city;
      if (cityCount[city]) {
        cityCount[city]++;
      } else {
        cityCount[city] = 1;
      }
    });
  });

  const trackedCities = Object.keys(cityCount).map(city => {
    return {
      city,
      trackedCount: cityCount[city]
    };
  });

  trackedCities.sort((a, b) => b.trackedCount - a.trackedCount);
  return trackedCities;
}

// Endpoint to get most tracked bills
app.get('/api/most_tracked_bills', (req, res) => {
  const billsData = readBillsData();
  const mostTrackedBills = getMostTrackedBills(billsData);
  res.json(mostTrackedBills);
});

// Endpoint to get most tracked cities
app.get('/api/most_tracked_cities', (req, res) => {
  const billsData = readBillsData();
  const mostTrackedCities = getMostTrackedCities(billsData);
  res.json(mostTrackedCities);
});

// Endpoint to track a bill
app.post('/api/track-bill', (req, res) => {
  const { serialNumber, city, state, date } = req.body;
  
  if (!serialNumber || !city || !state || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const billsData = readBillsData();
    
    // Initialize bill data if it doesn't exist
    if (!billsData[serialNumber]) {
      billsData[serialNumber] = {
        trackedHistory: []
      };
    }

    // Check if bill was tracked in the last 24 hours
    const lastTrack = billsData[serialNumber].trackedHistory[billsData[serialNumber].trackedHistory.length - 1];
    if (lastTrack) {
      const lastTrackDate = new Date(lastTrack.date);
      const currentDate = new Date(date);
      const hoursDiff = (currentDate - lastTrackDate) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        const remainingHours = 24 - hoursDiff;
        return res.status(400).json({ 
          error: 'This bill was already tracked within the last 24 hours',
          cooldownRemaining: remainingHours 
        });
      }
    }

    // Read existing data again to ensure we have latest
    const currentData = readBillsData();
    
    // Merge existing data with new tracking entry
    currentData[serialNumber] = {
      ...currentData[serialNumber],
      trackedHistory: [...(currentData[serialNumber]?.trackedHistory || []), { city, state, date }],
      lastTracked: date,
      trackedCount: ((currentData[serialNumber]?.trackedCount || 0) + 1)
    };
    
    // Save merged data
    fs.writeFileSync(path.join(__dirname, 'bills_data.json'), JSON.stringify(currentData, null, 2));
    
    res.json({ message: 'Bill tracked successfully' });
  } catch (error) {
    console.error('Error tracking bill:', error);
    res.status(500).json({ error: 'Error tracking bill' });
  }
});

// Endpoint to get user location
app.get('/api/get-location', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
  const cleanIp = ip.replace('::ffff:', '');
  
  const geo = geoip.lookup(cleanIp);
  
  if (geo && geo.city && geo.region) {
    res.json({
      city: geo.city,
      state: geo.region
    });
  } else {
    console.log('Could not detect location for IP:', cleanIp);
    res.status(500).json({
      error: 'Could not detect location'
    });
  }
});
