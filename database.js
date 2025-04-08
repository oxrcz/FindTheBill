
const fs = require('fs').promises;
const path = require('path');

class JSONDatabase {
  constructor() {
    this.validBillsPath = 'valid_bills.json';
    this.trackedBillsPath = 'tracked_bills.json';
  }

  async readJSON(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const defaultData = { 
          valid_bills: [], 
          tracked_bills: [] 
        };
        await this.writeJSON(filePath, defaultData);
        return defaultData;
      }
      console.error(`Error reading ${filePath}:`, error);
      throw error;
    }
  }

  async writeJSON(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async getValidBill(serialNumber) {
    const data = await this.readJSON(this.validBillsPath);
    return data.valid_bills.find(bill => bill.serial_number === serialNumber);
  }

  async getLastTrackedBill(serialNumber) {
    const data = await this.readJSON(this.trackedBillsPath);
    const bills = data.tracked_bills.filter(bill => bill.serialNumber === serialNumber);
    return bills.length > 0 ? bills[bills.length - 1] : null;
  }

  async trackBill(billData) {
    try {
      const data = await this.readJSON(this.trackedBillsPath);
      if (!data || !data.tracked_bills) {
        throw new Error('Invalid tracked bills data structure');
      }
      const existingBills = data.tracked_bills.filter(bill => bill.serialNumber === billData.serialNumber);
      const newId = data.tracked_bills.length + 1;
      const trackedBill = {
        id: newId,
        ...billData,
        times_tracked: existingBills.length + 1,
        timestamp: new Date().toISOString()
      };
      data.tracked_bills.push(trackedBill);
      await this.writeJSON(this.trackedBillsPath, data);
      return trackedBill;
    } catch (error) {
      console.error('Error tracking bill:', error);
      throw error;
    }
  }

  async getMostTrackedBills() {
    const data = await this.readJSON(this.trackedBillsPath);
    const billCounts = {};
    data.tracked_bills.forEach(bill => {
      billCounts[bill.serialNumber] = (billCounts[bill.serialNumber] || 0) + 1;
    });
    return Object.entries(billCounts)
      .map(([serial_number, tracked_count]) => ({ serial_number, tracked_count }))
      .sort((a, b) => b.tracked_count - a.tracked_count)
      .slice(0, 10);
  }

  async getMostTrackedCities() {
    const data = await this.readJSON(this.trackedBillsPath);
    const cityCounts = {};
    data.tracked_bills.forEach(bill => {
      const key = `${bill.city},${bill.state}`;
      cityCounts[key] = (cityCounts[key] || 0) + 1;
    });
    return Object.entries(cityCounts)
      .map(([key, tracked_count]) => {
        const [city, state] = key.split(',');
        return { city, state, tracked_count };
      })
      .sort((a, b) => b.tracked_count - a.tracked_count);
  }

  async getBillHistory(serialNumber) {
    const data = await this.readJSON(this.trackedBillsPath);
    return data.tracked_bills.filter(bill => bill.serialNumber === serialNumber);
  }
}

module.exports = new JSONDatabase();
