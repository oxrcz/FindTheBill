
const db = require('./database');
const fs = require('fs');

try {
    const validBillsData = JSON.parse(fs.readFileSync('valid_bills.json', 'utf8'));
    
    db.serialize(() => {
        // Clear existing valid bills
        db.run('DELETE FROM valid_bills', [], (err) => {
            if (err) {
                console.error('Error clearing valid bills:', err);
                return;
            }
            
            // Insert new valid bills
            const stmt = db.prepare('INSERT INTO valid_bills (serial_number, bill_value) VALUES (?, ?)');
            validBillsData.valid_bills.forEach(bill => {
                stmt.run(bill.serial_number, bill.bill_value, (err) => {
                    if (err) {
                        console.error('Error inserting bill:', bill.serial_number, err);
                    }
                });
            });
            stmt.finalize(() => {
                console.log('Valid bills initialized in database');
                // Verify the data
                db.all("SELECT * FROM valid_bills", [], (err, rows) => {
                    if (err) {
                        console.error('Error verifying bills:', err);
                    } else {
                        console.log('Verified bills in database:', rows);
                    }
                });
            });
        });
    });
} catch (error) {
    console.error('Error processing valid_bills.json:', error);
}
