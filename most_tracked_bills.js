
document.addEventListener('DOMContentLoaded', function() {
  fetch('/api/most_tracked_bills')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const billsTableBody = document.getElementById('billsTable').getElementsByTagName('tbody')[0];
      
      if (!data || data.length === 0) {
        const row = billsTableBody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 2;
        cell.textContent = 'No tracked bills found';
        return;
      }

      data.forEach(bill => {
        const row = billsTableBody.insertRow();
        const serialCell = row.insertCell(0);
        const trackedCountCell = row.insertCell(1);

        serialCell.textContent = bill.serialNumber;
        trackedCountCell.textContent = bill.trackedCount;
      });
    })
    .catch(error => {
      const billsTable = document.getElementById('billsTable');
      const errorDiv = document.createElement('div');
      errorDiv.style.color = 'red';
      errorDiv.style.padding = '10px';
      errorDiv.textContent = `Error loading tracked bills: ${error.message}`;
      billsTable.parentNode.insertBefore(errorDiv, billsTable);
    });
});
