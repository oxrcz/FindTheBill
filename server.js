const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

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

// Your existing code (e.g., middleware, routes)
app.get('/api/most_tracked_bills', (req, res) => {
    // Your handler code
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

// Helper function to get most tracked bills
function getMostTrackedBills(billsData) {
  const trackedBills = Object.keys(billsData).map(serialNumber => {
    return {
      serialNumber,
      trackedCount: billsData[serialNumber].trackedHistory.length
    };
  });

  trackedBills.sort((a, b) => b.trackedCount - a.trackedCount);
  return trackedBills;
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
