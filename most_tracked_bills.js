document.addEventListener('DOMContentLoaded', function() {
  // Render the table with a loading message initially
  const billsTableBody = document.getElementById('billsTable').getElementsByTagName('tbody')[0];
  const loadingMessage = document.getElementById('loadingMessage');

  // Fetch the data asynchronously without blocking the initial page load
  fetch('/api/most_tracked_bills')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Remove the loading message
      loadingMessage.remove();

      if (!data || data.length === 0) {
        const row = billsTableBody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 2;
        cell.textContent = 'No tracked bills found';
        return;
      }

      data.forEach((bill, index) => {
        const row = billsTableBody.insertRow();
        const serialCell = row.insertCell(0);
        const trackedCountCell = row.insertCell(1);

        const link = document.createElement('a');
        link.href = `/bill/${bill.serialNumber}`;
        link.textContent = bill.serialNumber;
        serialCell.appendChild(link);

        trackedCountCell.textContent = bill.trackedCount;

        // Alternate row colors
        row.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      });
    })
    .catch(error => {
      // If an error occurs, show an error message in place of the table
      const billsTable = document.getElementById('billsTable');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = `Error loading tracked bills: ${error.message}`;
      billsTable.parentNode.insertBefore(errorDiv, billsTable);
    });
});
