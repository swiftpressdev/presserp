# PressERP Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/presserp

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Admin Registration Client Secret
CLIENT_SECRET=your-secure-client-secret-for-admin-registration

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start MongoDB

**Option A: Local MongoDB**
```bash
mongod
```

**Option B: MongoDB Atlas**
- Create a cluster at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
- Get your connection string
- Update `MONGODB_URI` in `.env`

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## First Time Setup

### Step 1: Register Admin Account

1. Navigate to [http://localhost:3000/register](http://localhost:3000/register)
2. Fill in the form:
   - **Name**: Your company name or your name
   - **Email**: admin@example.com
   - **Password**: Your secure password
   - **Client Secret**: Use the value from your `.env` file
3. Click "Register"

### Step 2: Login

1. Navigate to [http://localhost:3000/login](http://localhost:3000/login)
2. Enter your email and password
3. Click "Sign in"

### Step 3: Explore the Dashboard

You now have access to all modules:
- Dashboard (Home)
- Clients
- Papers
- Quotation
- Jobs Creator
- Equipment
- Estimates
- User Management (Admin only)

## Module Setup Order (Recommended)

For best experience, set up modules in this order:

### 1. Clients
- Click "Clients" in sidebar
- Click "Add Client"
- Fill in client information
- Create at least 2-3 clients for testing

### 2. Papers
- Click "Papers" in sidebar
- Click "Add Paper"
- Add different paper types (Ream, Packet, Sheet)
- Create multiple paper entries with different sizes and weights

### 3. Equipment
- Click "Equipment" in sidebar
- Click "Add Equipment"
- Add printing machines and other equipment
- Include size, status, and maintenance dates (in BS format)

### 4. Jobs Creator
- Click "Jobs Creator" in sidebar
- Click "Create Job"
- Select a client from dropdown
- Enter job details (dates in BS format)
- Select paper type and equipment
- Fill in all required fields
- Create multiple jobs

### 5. Quotations
- Click "Quotation" in sidebar
- Click "Create Quotation"
- Enter party details
- Add particulars (items/services)
- Enable/disable VAT as needed
- Click "Create Quotation"
- Use "Export PDF" to download quotation

### 6. Estimates
- Click "Estimates" in sidebar
- Click "Create Estimate"
- Select a client (this filters available jobs)
- Select a job (auto-populates job details)
- Add cost particulars
- Enable/disable VAT
- Click "Create Estimate"
- Use "Export PDF" to download estimate

### 7. User Management (Admin Only)
- Click "User Management" in sidebar
- Click "Add User"
- Create users for your team
- Users can login but cannot create other users

## Testing the System

### Test Multi-Tenancy

1. Register a second admin with a different email
2. Login with the second admin
3. Create some clients and jobs
4. Logout and login with first admin
5. Verify you only see your own data

### Test VAT Calculations

1. Create a quotation or estimate
2. Add some particulars with quantities and rates
3. Toggle VAT between Yes and No
4. Verify calculations:
   - Without VAT: Grand Total = Total
   - With VAT: Subtotal = Total / 1.13, VAT = Subtotal * 0.13, Grand Total = Subtotal + VAT

### Test PDF Export

1. Create a quotation
2. Click "Export PDF" button
3. Verify PDF downloads with all details
4. Repeat for estimates

### Test Bikram Sambat Dates

1. In equipment, use BS date format: YYYY-MM-DD
2. In jobs, enter job date and delivery date in BS format
3. Verify dates display correctly as YYYY/MM/DD

### Test Auto-Generated Numbers

1. Create multiple quotations
   - First: SWQ-001
   - Second: SWQ-002
   - etc.
2. Create multiple jobs
   - First: SWJ-001
   - Second: SWJ-002
   - etc.
3. Create multiple estimates
   - First: SWE-001
   - Second: SWE-002
   - etc.

## Common Issues

### MongoDB Connection Error

**Error**: `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution**:
- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env`
- Verify port 27017 is not in use by another application

### Client Secret Invalid

**Error**: "Invalid client secret"

**Solution**:
- Ensure the value in the registration form matches `CLIENT_SECRET` in `.env`
- No extra spaces or characters
- Case-sensitive

### JWT Verification Failed

**Error**: "Unauthorized" or session issues

**Solution**:
- Clear browser cookies
- Logout and login again
- Ensure `JWT_SECRET` hasn't changed

### Date Format Issues

**Error**: Invalid date or date not displaying

**Solution**:
- Use BS format: YYYY-MM-DD (e.g., 2081-09-15)
- Ensure no leading/trailing spaces
- Use valid BS date ranges

## Production Deployment

### Environment Variables

Update these for production:

```env
NODE_ENV=production
JWT_SECRET=<generate-long-random-string>
CLIENT_SECRET=<generate-long-random-string>
MONGODB_URI=<production-mongodb-url>
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Build and Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Deployment Platforms

**Vercel** (Recommended):
```bash
npm i -g vercel
vercel
```

**Other Options**:
- Railway
- Render
- DigitalOcean
- AWS
- Azure

## Additional Configuration

### Customize Company Information

Edit dashboard layout and PDF generation files to include:
- Company logo
- Company address
- Tax registration numbers
- Contact information

### Modify Serial Number Prefixes

Edit `lib/counterService.ts`:

```typescript
const PREFIX_MAP: Record<CounterName, string> = {
  [CounterName.QUOTATION]: 'SWQ',  // Change prefix here
  [CounterName.JOB]: 'SWJ',        // Change prefix here
  [CounterName.ESTIMATE]: 'SWE',   // Change prefix here
};
```

### Adjust VAT Percentage

Edit quotation and estimate logic to change from 13% to your rate.

## Support

For technical support or questions:
- Review the README.md file
- Check the codebase documentation
- Contact the development team

## Security Checklist

Before going to production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Change `CLIENT_SECRET` to a strong random string
- [ ] Use MongoDB Atlas with authentication
- [ ] Enable HTTPS/SSL
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS if needed
- [ ] Review and test all authentication flows
- [ ] Test multi-tenancy data isolation
- [ ] Backup database regularly
- [ ] Monitor error logs
