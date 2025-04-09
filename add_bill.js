
const fs = require('fs').promises;

async function addBill(serialNumber, value) {
  try {
    const data = await fs.readFile('valid_bills.json', 'utf8');
    const bills = JSON.parse(data);
    
    bills.valid_bills.push({
      "serial_number": serialNumber,
      "bill_value": parseInt(value)
    });

    await fs.writeFile('valid_bills.json', JSON.stringify(bills, null, 2));
    console.log(`Successfully added bill ${serialNumber} with value $${value}`);
  } catch (error) {
    console.error('Error adding bill:', error);
  }
}

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('Usage: node add_bill.js <serial_number> <value>');
  process.exit(1);
}

addBill(args[0], args[1]);
