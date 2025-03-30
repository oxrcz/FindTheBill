const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

// Define a route for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Your existing code (e.g., middleware, routes)
app.get('/api/most-tracked-bills', (req, res) => {
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
app.get('/api/most-tracked-bills', (req, res) => {
  const billsData = readBillsData();
  const mostTrackedBills = getMostTrackedBills(billsData);
  res.json(mostTrackedBills);
});

// Endpoint to get most tracked cities
app.get('/api/most-tracked-cities', (req, res) => {
  const billsData = readBillsData();
  const mostTrackedCities = getMostTrackedCities(billsData);
  res.json(mostTrackedCities);
});
