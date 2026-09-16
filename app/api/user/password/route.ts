import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { d1, UserRecord } from '@/lib/d1';
import { getCurrentSession } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const user = await d1
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(session.userId)
      .first<UserRecord>();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid password format', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    // If user already has a password set, require and verify the current password
    if (user.password_hash) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Please enter your current password.' },
          { status: 400 }
        );
      }

      const isValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect.' },
          { status: 400 }
        );
      }
    }

    // Hash the new password using PBKDF2 Web Crypto
    const newHash = await hashPassword(newPassword);

    await d1
      .prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(newHash, user.id)
      .run();

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully!',
    });
  } catch (err: any) {
    console.error('❌ [Password Change Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}
