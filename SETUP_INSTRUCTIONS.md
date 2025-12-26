# Kigali Mall Inventory Management System - Setup Guide

## Complete Installation Instructions

### Prerequisites
- XAMPP (Apache + MySQL) installed and running
- Node.js (v16 or higher) installed
- npm package manager

### Step 1: Database Setup

1. **Start XAMPP Control Panel**
   - Start Apache
   - Start MySQL

2. **Create Database**
   - Open phpMyAdmin (http://localhost/phpmyadmin)
   - Click "SQL" tab
   - Copy and paste the entire contents of `kigali-mall/database_setup.sql`
   - Click "Go" to execute
   - This will create all tables and seed initial data

3. **Verify Database**
   - Database name: `kigali_inventory`
   - Default admin login:
     - Username: `admin`
     - Password: `admin123`

### Step 2: Backend Setup (PHP API)

1. **Locate API Files**
   - Files are already in: `C:/xampp/htdocs/kigali-mall/api/`
   - Ensure these files exist:
     - `config.php` (database connection)
     - `main.php` (main API endpoint)

2. **Verify Database Connection**
   - Open `kigali-mall/api/config.php`
   - Check database credentials match your XAMPP setup:
     ```php
     $host = 'localhost';
     $db   = 'kigali_inventory';
     $user = 'root';
     $pass = '';  // Default XAMPP password
     ```

3. **Test API**
   - Open browser: http://localhost/kigali-mall/api/main.php
   - Should show: `{"error":"Action not found"}` (this is normal - means API is working)

### Step 3: Frontend Setup (React)

1. **Navigate to Frontend Directory**
   ```bash
   cd mall-frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```
   
   This installs:
   - React
   - Vite
   - Tailwind CSS
   - jsPDF (for PDF exports)
   - jsPDF-AutoTable

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - The app should automatically open in your browser

### Step 4: First Login

1. **Login Credentials**
   - Username: `admin`
   - Password: `admin123`

2. **OTP Verification**
   - After entering credentials, an OTP will be displayed in an alert
   - Enter the 6-digit OTP code
   - You'll be redirected to the dashboard

### Step 5: Production Build (Optional - For Deployment)

1. **Build React App**
   ```bash
   cd mall-frontend
   npm run build
   ```

2. **Deploy Files**
   - Copy contents of `mall-frontend/dist/` folder
   - Paste into `C:/xampp/htdocs/kigali-mall/`
   - Ensure `.htaccess` file is in the root

### Troubleshooting

#### CORS Errors
- **Problem**: "Access-Control-Allow-Origin" errors
- **Solution**: 
  - Check Apache is running
  - Verify `main.php` has CORS headers at the top
  - Restart Apache

#### Database Connection Errors
- **Problem**: "Database connection failed"
- **Solution**:
  - Ensure MySQL is running in XAMPP
  - Check database name is `kigali_inventory`
  - Verify credentials in `config.php`

#### 401 Unauthorized on Login
- **Problem**: Login fails even with correct credentials
- **Solution**:
  - Re-run the SQL setup script
  - Verify password hash in database matches `$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm`
  - This hash corresponds to password: `admin123`

#### React App Not Loading
- **Problem**: Blank page or errors
- **Solution**:
  - Check Node.js is installed: `node --version`
  - Reinstall dependencies: `rm -rf node_modules && npm install`
  - Clear browser cache (Ctrl+F5)

### System Features

✅ **Authentication**
- Username/Password login
- OTP (One-Time Password) verification
- Auto-logout after 10 minutes of inactivity

✅ **Inventory Management**
- View all items with current stock
- Add new items
- Track categories
- Monitor reorder levels

✅ **Stock Operations**
- Stock In (Receive items from suppliers)
- Stock Out (POS/Sales with EBM signatures)
- Stock Adjustments (Damage, corrections)

✅ **AI Analytics**
- Daily burn rate calculation
- Days until stockout prediction
- Suggested reorder quantities
- Low stock alerts

✅ **EBM Integration**
- Automatic EBM signature generation
- RRA-compliant transaction recording
- EBM transaction history

✅ **Reports**
- PDF export of inventory reports
- EBM transaction reports
- Printable RRA-compliant documents

✅ **Suppliers Management**
- Track supplier information
- Link stock-in to suppliers

✅ **Transaction History**
- Complete audit trail
- View all stock movements
- Filter by date/type

### File Structure

```
kigali-mall/
├── api/
│   ├── config.php          # Database configuration
│   └── main.php            # Main API endpoint
├── database_setup.sql      # Database schema
└── .htaccess              # Apache routing rules

mall-frontend/
├── src/
│   ├── App.jsx            # Main application component
│   ├── main.jsx           # React entry point
│   ├── components/
│   │   ├── Dashboard.jsx           # Analytics dashboard
│   │   ├── LoginFlow.jsx          # Login & OTP screens
│   │   ├── StockManagement.jsx    # Stock operations
│   │   └── ReportExport.jsx       # PDF generation
│   └── hooks/
│       └── useIdleLogout.js       # Auto-logout hook
├── package.json
└── vite.config.js
```

### API Endpoints

All endpoints are accessed via: `http://localhost/kigali-mall/api/main.php?action={action}`

**Authentication:**
- `login` - POST: {username, password}
- `verify_otp` - POST: {username, otp}

**Inventory:**
- `get_items` - GET: Returns all items with stock
- `add_item` - POST: Add new item
- `analytics` - GET: AI predictions and analytics
- `dashboard_stats` - GET: Dashboard statistics

**Stock Operations:**
- `stock_in` - POST: Receive stock
- `stock_out` - POST: Record sale (generates EBM)
- `stock_adjust` - POST: Adjust inventory

**Reports:**
- `ebm_report` - GET: EBM transactions for PDF
- `stock_in_history` - GET: Stock in transactions
- `stock_out_history` - GET: Stock out transactions

### Support

For issues or questions:
1. Check browser console (F12) for errors
2. Check XAMPP error logs
3. Verify all prerequisites are installed
4. Ensure database is properly set up

### Security Notes

- **Development Mode**: OTP is shown in alert (remove in production)
- **Production**: Implement SMS/Email for OTP delivery
- **EBM**: Currently using placeholder signatures - replace with actual RRA VSDC integration
- **Password**: Change default admin password after first login

---

**System Status**: ✅ Ready for Development
**Last Updated**: 2024

