const fs = require('fs').promises;
const path = require('path');

async function initValidBills() {
  try {
    const validBillsRaw = await fs.readFile('valid_bills.json', 'utf8');
    const validBillsData = JSON.parse(validBillsRaw);

    // Create a new valid_bills.json if it doesn't exist
    await fs.writeFile('valid_bills.json', JSON.stringify(validBillsData, null, 2));

    console.log('Valid bills initialized in database');

    // Verify the data
    const verifyData = await fs.readFile('valid_bills.json', 'utf8');
    console.log('Verified bills in database:', JSON.parse(verifyData));
  } catch (error) {
    console.error('Error processing valid_bills.json:', error);
  }
}

initValidBills();
