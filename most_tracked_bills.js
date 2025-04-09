<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Find The Bill - Most Tracked Bills</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        /* Additional styles specific to most_tracked_bills.html */
        .filter-section {
            text-align: center;
            margin-bottom: 20px;
        }
        
        table {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .loading-message {
            font-size: 1.2em;
            color: #0066cc;
        }
    </style>
</head>
<body>
    <nav>
        <button class="menu-button" style="display: none;">
            <span></span>
            <span></span>
            <span></span>
        </button>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/most_tracked_bills">Most Tracked Bills</a>
            <a href="/most_tracked_cities">Most Tracked Cities</a>
            <a href="/about">About</a>
        </div>
    </nav>
    <script>
        const menuButton = document.querySelector('.menu-button');
        const navLinks = document.querySelector('.nav-links');
        
        function toggleMenu() {
            navLinks.classList.toggle('active');
        }
        
        if (window.innerWidth <= 768) {
            menuButton.style.display = 'block';
            menuButton.addEventListener('click', toggleMenu);
        }
        
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                menuButton.style.display = 'block';
                menuButton.addEventListener('click', toggleMenu);
            } else {
                menuButton.style.display = 'none';
                navLinks.classList.remove('active');
            }
        });
    </script>

    <div class="logo">FindTheBill.net</div>
    <h1>Top 10 Most Tracked Bills</h1>
    <div class="filter-section">
        <label for="denominationFilter">Filter by denomination: </label>
        <select id="denominationFilter">
            <option value="all">All</option>
            <option value="1">$1</option>
            <option value="2">$2</option>
            <option value="5">$5</option>
            <option value="10">$10</option>
            <option value="20">$20</option>
            <option value="50">$50</option>
            <option value="100">$100</option>
        </select>
    </div>
    <div id="loadingMessage" class="loading-message">Loading tracked bills...</div>
    <table id="billsTable">
        <thead>
            <tr>
                <th>Serial Number</th>
                <th>Value</th>
                <th>Times Tracked</th>
            </tr>
        </thead>
        <tbody>
            <!-- Data will be inserted here by JavaScript -->
        </tbody>
    </table>

    <script src="most_tracked_bills.js"></script>
</body>
</html>
