# Development Guide

## Project Architecture

### Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with httpOnly cookies
- **Styling**: Tailwind CSS v4
- **State Management**: React Context API
- **Validation**: Zod
- **PDF Generation**: jsPDF with autoTable
- **Notifications**: React Hot Toast
- **Date System**: Bikram Sambat (Nepali calendar)

### Architecture Patterns

1. **Multi-Tenancy**: Every resource is scoped to an admin using `adminId`
2. **Authentication**: JWT-based with role separation (Admin/User)
3. **API Structure**: RESTful API routes in Next.js
4. **Data Flow**: Server-side validation → Database → Client state
5. **Reusability**: Shared components, utilities, and schemas

## Directory Structure Explained

```
presserp/
├── app/                          # Next.js App Router
│   ├── api/                      # API Route Handlers
│   │   └── [resource]/          # Resource-specific endpoints
│   │       └── route.ts         # GET, POST handlers
│   ├── dashboard/               # Protected dashboard pages
│   │   └── [module]/           # Module-specific pages
│   │       ├── page.tsx        # List/index page
│   │       └── create/         # Create page
│   │           └── page.tsx
│   ├── login/                   # Public login page
│   ├── register/                # Public registration page
│   ├── layout.tsx               # Root layout with providers
│   ├── globals.css              # Global styles
│   └── page.tsx                 # Home page (redirects)
├── components/                  # Reusable components
│   ├── DashboardLayout.tsx     # Layout with sidebar
│   └── ParticularsTable.tsx    # Shared table component
├── contexts/                    # React Context providers
│   ├── AuthContext.tsx         # Authentication state
│   └── ToastContext.tsx        # Toast notifications
├── lib/                         # Utilities and helpers
│   ├── auth.ts                 # Auth utilities
│   ├── baseSchema.ts           # Base Mongoose schema
│   ├── counterService.ts       # Auto-increment logic
│   ├── dateUtils.ts            # BS date utilities
│   ├── jwt.ts                  # JWT generation/verification
│   ├── mongodb.ts              # MongoDB connection
│   ├── pdfUtils.ts             # PDF generation
│   └── types.ts                # TypeScript definitions
└── models/                      # Mongoose schemas/models
    ├── Admin.ts
    ├── User.ts
    ├── Client.ts
    ├── Paper.ts
    ├── Equipment.ts
    ├── Quotation.ts
    ├── Job.ts
    ├── Estimate.ts
    └── Counter.ts
```

## Adding a New Module

Follow this step-by-step guide to add a new module (e.g., "Suppliers"):

### 1. Create Mongoose Model

Create `models/Supplier.ts`:

```typescript
import mongoose, { Schema, Document } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface ISupplier extends Document {
  adminId: string;
  supplierName: string;
  contactNumber: string;
  address: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    ...baseSchemaFields,
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  baseSchemaOptions
);

SupplierSchema.index({ adminId: 1 });

export default mongoose.models.Supplier || 
  mongoose.model<ISupplier>('Supplier', SupplierSchema);
```

### 2. Create API Route

Create `app/api/suppliers/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Supplier from '@/models/Supplier';
import { requireAuth, getAdminId } from '@/lib/auth';
import { z } from 'zod';

const supplierSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name is required'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  address: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const suppliers = await Supplier.find({ adminId }).sort({ createdAt: -1 });
    return NextResponse.json({ suppliers }, { status: 200 });
  } catch (error: any) {
    console.error('Get suppliers error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth();
    const adminId = getAdminId(user);

    const body = await request.json();
    const validatedData = supplierSchema.parse(body);

    const supplier = await Supplier.create({
      ...validatedData,
      adminId,
      createdBy: user.email,
    });

    return NextResponse.json(
      { message: 'Supplier created successfully', supplier },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create supplier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3. Create List Page

Create `app/dashboard/suppliers/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Supplier {
  _id: string;
  supplierName: string;
  contactNumber: string;
  address?: string;
}

export default function SuppliersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchSuppliers();
    }
  }, [user]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuppliers(data.suppliers);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
          <Link
            href="/dashboard/suppliers/create"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add Supplier
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No suppliers found.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Supplier Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {supplier.supplierName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {supplier.contactNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {supplier.address || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
```

### 4. Create Form Page

Create `app/dashboard/suppliers/create/page.tsx` (similar pattern as Clients create page).

### 5. Add to Navigation

Update `components/DashboardLayout.tsx`:

```typescript
const menuItems: MenuItem[] = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Clients', path: '/dashboard/clients' },
  { name: 'Suppliers', path: '/dashboard/suppliers' }, // Add here
  // ... rest of menu items
];
```

## Code Standards

### TypeScript

- Use strict mode
- Explicit return types for functions
- Proper interface definitions
- No `any` unless absolutely necessary

### React Components

- Use functional components
- Hooks for state management
- Proper cleanup in useEffect
- Loading and error states

### API Routes

- Always validate input with Zod
- Proper error handling
- Admin-scoped queries
- HTTP status codes (200, 201, 400, 401, 500)

### Database

- Use indexes for frequently queried fields
- Include `adminId` in all schemas (except Admin)
- Use `createdBy` to track who created records
- Enable timestamps

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Components**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase with `I` prefix

## Testing Strategy

### Manual Testing Checklist

1. **Authentication**
   - [ ] Admin registration with valid/invalid client secret
   - [ ] Login with valid/invalid credentials
   - [ ] Session persistence
   - [ ] Logout functionality

2. **Multi-Tenancy**
   - [ ] Data isolation between admins
   - [ ] Queries scoped to adminId
   - [ ] No cross-tenant data leakage

3. **CRUD Operations**
   - [ ] Create records
   - [ ] Read/list records
   - [ ] Proper error messages
   - [ ] Toast notifications

4. **Business Logic**
   - [ ] Auto-increment serial numbers
   - [ ] VAT calculations
   - [ ] PDF generation
   - [ ] Date formatting (BS)

## Common Development Tasks

### Adding a New Enum Type

Edit `lib/types.ts`:

```typescript
export enum NewType {
  OPTION_ONE = 'Option One',
  OPTION_TWO = 'Option Two',
}
```

### Modifying VAT Percentage

Search for `1.13` and `0.13` in:
- API routes (quotations, estimates)
- Components (ParticularsTable)
- Update calculation logic

### Changing Serial Number Format

Edit `lib/counterService.ts`:
- Modify PREFIX_MAP
- Adjust padding in getNextSequenceNumber

### Adding Admin-Only Route

```typescript
// In API route
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(); // Throws if not admin
  // ... rest of code
}
```

```typescript
// In UI page
if (user && user.role !== UserRole.ADMIN) {
  router.push('/dashboard');
  toast.error('Admin access required');
}
```

## Debugging Tips

### MongoDB Connection Issues

```typescript
// Add to mongodb.ts for debugging
mongoose.set('debug', true);
```

### JWT Token Issues

```typescript
// Check token in browser DevTools
// Application → Cookies → token
```

### API Request Debugging

```typescript
// Add logging in API routes
console.log('Request body:', body);
console.log('Validated data:', validatedData);
console.log('Created record:', record);
```

## Performance Optimization

1. **Database Indexes**: Add indexes to frequently queried fields
2. **Pagination**: Implement pagination for large lists
3. **Caching**: Consider Redis for session storage
4. **Image Optimization**: Use Next.js Image component
5. **Code Splitting**: Automatic with Next.js App Router

## Security Best Practices

1. Always validate input with Zod
2. Use parameterized queries (Mongoose handles this)
3. Never log sensitive data
4. Keep dependencies updated
5. Use environment variables for secrets
6. Implement rate limiting for production
7. Use HTTPS in production
8. Regular security audits

## Deployment Checklist

- [ ] Environment variables configured
- [ ] MongoDB Atlas or production DB setup
- [ ] Strong JWT_SECRET and CLIENT_SECRET
- [ ] NODE_ENV=production
- [ ] Build succeeds without errors
- [ ] All linter warnings resolved
- [ ] Manual testing completed
- [ ] Backup strategy in place
- [ ] Monitoring and logging configured
- [ ] SSL certificate installed

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Getting Help

For development questions:
1. Check this documentation
2. Review existing code patterns
3. Check Next.js and package documentation
4. Contact the development team
