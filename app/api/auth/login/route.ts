import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';
import User from '@/models/User';
import { generateToken } from '@/lib/jwt';
import { UserRole } from '@/lib/types';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    let user: any = null;
    let role: UserRole | null = null;
    let adminId: string | undefined = undefined;

    const admin = await Admin.findOne({ email: validatedData.email });
    if (admin) {
      const isPasswordValid = await bcrypt.compare(validatedData.password, admin.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      user = admin;
      role = UserRole.ADMIN;
    } else {
      const regularUser = await User.findOne({ email: validatedData.email });
      if (!regularUser) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const isPasswordValid = await bcrypt.compare(validatedData.password, regularUser.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      user = regularUser;
      role = UserRole.USER;
      adminId = regularUser.adminId.toString();
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: role!,
      adminId,
    });

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: role,
        },
      },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
