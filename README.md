# PressERP - Multi-Tenant Printing Press Management System

A comprehensive, production-ready ERP system built with Next.js 16, TypeScript, MongoDB, and Tailwind CSS for managing printing press operations.

## Features

### Multi-Tenancy
- Complete data isolation per admin/company
- Admin-scoped data with automatic tenant filtering
- Secure JWT-based authentication
- Role-based access control (Admin & User roles)

### Core Modules

1. **Dashboard**
   - Analytics overview
   - Recent activities
   - Pending deliveries tracking

2. **Clients Management**
   - Add and manage client information
   - Contact person details
   - Department tracking

3. **Papers Management**
   - Paper type categorization (Ream, Packet, Sheet, Others)
   - Paper size and weight specifications

4. **Quotations**
   - Auto-generated quotation numbers (SWQ-001, SWQ-002, etc.)
   - Dynamic particulars table with automatic calculations
   - VAT handling (13% calculation)
   - PDF export functionality

5. **Jobs Creator**
   - Comprehensive job management
   - Job types (Inner/Outer)
   - Paper and equipment selection
   - Plate management
   - Lamination, folding, binding options
   - Additional services tracking
   - Job relationships
   - Bikram Sambat date handling

6. **Equipment Management**
   - Equipment tracking
   - Maintenance date recording (BS calendar)
   - Status monitoring

7. **Estimates**
   - Client and job-based estimates
   - Auto-generated estimate numbers (SWE-001, SWE-002, etc.)
   - Job details auto-population
   - VAT calculations
   - PDF export functionality

8. **User Management** (Admin Only)
   - Create users under admin account
   - User authentication and authorization
   - Access control

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (httpOnly cookies)
- **Styling**: Tailwind CSS v4
- **Date Handling**: Bikram Sambat calendar
- **PDF Generation**: jsPDF with autoTable
- **Notifications**: React Hot Toast
- **Validation**: Zod

## Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd presserp
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/presserp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CLIENT_SECRET=your-secure-client-secret-for-admin-registration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Getting Started

### Admin Registration

1. Navigate to `/register`
2. Fill in the registration form:
   - Name
   - Email
   - Password
   - Client Secret (from environment variable)
3. Click "Register" to create an admin account

### Login

1. Navigate to `/login` or root `/`
2. Enter email and password
3. Click "Sign in" to access the dashboard

### Creating Users (Admin Only)

1. Navigate to "User Management" in the sidebar
2. Click "Add User"
3. Fill in user details
4. Users can log in but cannot manage other users

## Project Structure

```
presserp/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── clients/           # Clients API
│   │   ├── papers/            # Papers API
│   │   ├── equipment/         # Equipment API
│   │   ├── quotations/        # Quotations API
│   │   ├── jobs/              # Jobs API
│   │   ├── estimates/         # Estimates API
│   │   └── users/             # Users API (Admin only)
│   ├── dashboard/             # Protected dashboard routes
│   ├── login/                 # Login page
│   ├── register/              # Admin registration page
│   ├── layout.tsx             # Root layout with providers
│   └── page.tsx               # Home page (redirects to login)
├── components/
│   ├── DashboardLayout.tsx    # Reusable dashboard layout
│   └── ParticularsTable.tsx   # Reusable particulars table
├── contexts/
│   ├── AuthContext.tsx        # Authentication context
│   └── ToastContext.tsx       # Toast notifications
├── lib/
│   ├── auth.ts                # Auth utilities
│   ├── baseSchema.ts          # Base Mongoose schema
│   ├── counterService.ts      # Auto-increment service
│   ├── dateUtils.ts           # Bikram Sambat utilities
│   ├── jwt.ts                 # JWT utilities
│   ├── mongodb.ts             # MongoDB connection
│   ├── pdfUtils.ts            # PDF generation
│   └── types.ts               # TypeScript types
├── models/                    # Mongoose models
│   ├── Admin.ts
│   ├── User.ts
│   ├── Client.ts
│   ├── Paper.ts
│   ├── Equipment.ts
│   ├── Quotation.ts
│   ├── Job.ts
│   ├── Estimate.ts
│   └── Counter.ts
└── package.json
```

## Key Features Explained

### Multi-Tenancy Implementation

Every document in the database includes:
- `adminId`: References the admin/tenant
- `createdBy`: User email who created the record
- `timestamps`: Created and updated dates

All queries are automatically scoped by `adminId` to ensure data isolation.

### Auto-Generated Serial Numbers

The system uses a counter service to generate sequential numbers:
- Quotations: SWQ-001, SWQ-002, etc.
- Jobs: SWJ-001, SWJ-002, etc.
- Estimates: SWE-001, SWE-002, etc.

Counters are tenant-specific and start from 001.

### VAT Calculation

When VAT is enabled (13%):
1. Calculate subtotal: `Total / 1.13`
2. Calculate VAT: `Subtotal * 0.13`
3. Grand Total: `Subtotal + VAT`

When VAT is disabled:
- Grand Total = Total

### Bikram Sambat Dates

All dates in the system use the Bikram Sambat (BS) calendar format (YYYY-MM-DD).
The `dateUtils.ts` file provides utilities for:
- Getting current BS date
- Formatting BS dates
- Validating BS dates

### Authentication Flow

1. User clicks login button (not on page load)
2. Credentials are validated
3. JWT token is generated and stored in httpOnly cookie
4. Session is checked for protected routes
5. Token contains user ID, email, role, and adminId

## Security Features

- JWT tokens stored in httpOnly cookies
- Password hashing with bcrypt (12 rounds)
- Admin registration requires client secret
- Role-based access control
- All database queries are admin-scoped
- CSRF protection through SameSite cookies
- Input validation with Zod

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register admin
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Check session

### Resources (Protected)
- `GET/POST /api/clients` - Clients management
- `GET/POST /api/papers` - Papers management
- `GET/POST /api/equipment` - Equipment management
- `GET/POST /api/quotations` - Quotations management
- `GET/POST /api/jobs` - Jobs management
- `GET/POST /api/estimates` - Estimates management
- `GET/POST /api/users` - User management (Admin only)

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Update `JWT_SECRET` and `CLIENT_SECRET` with strong values
3. Configure MongoDB Atlas or production database
4. Build the application:
```bash
npm run build
```

5. Start production server:
```bash
npm start
```

## Contributing

This is a production-ready system. Follow these guidelines:
- Write TypeScript with strict types
- Use enterprise-grade code standards
- Maintain modular architecture
- Add proper error handling
- Write clean, documented code
- No emojis in code or UI

## License

Proprietary - All rights reserved

## Support

For issues and questions, contact the development team.
