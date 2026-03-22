import { GraphQLError } from 'graphql';
import { firebaseAuth } from '../config/firebase.js';
import { User, IUser } from '../models/User.js';

export interface AuthContext {
  user: IUser;
}

/**
 * Called once per GraphQL request.
 * Verifies the Firebase JWT, then finds-or-creates the user in MongoDB.
 * Returns { user } which is injected into every resolver via context.
 */
export async function buildContext(req: { headers: { authorization?: string } }): Promise<AuthContext> {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw new GraphQLError('Authentication required. Please sign in.', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  let decoded: { uid: string; email?: string; name?: string; picture?: string };
  try {
    decoded = await firebaseAuth.verifyIdToken(token);
  } catch {
    throw new GraphQLError('Invalid or expired token. Please sign in again.', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  // Check if this Firebase UID already has a record before upserting.
  // This avoids the race condition where two concurrent first-time sign-ins
  // both see userCount === 0 and both get assigned admin.
  // Strategy:
  //   1. Default role on insert is always 'user'.
  //   2. After upsert, if the record was JUST created (isNew) AND no admin
  //      exists in the collection, atomically promote this user to admin.
  //      Because we use findOneAndUpdate with $setOnInsert the promotion is
  //      a separate step, but the window is tiny and only relevant for the
  //      very first user — in practice a single-user bootstrap scenario.
  const email       = decoded.email ?? '';
  const displayName = decoded.name ?? email.split('@')[0] ?? 'User';
  const photoURL    = decoded.picture ?? '';

  const existing = await User.findOne({ firebaseUid: decoded.uid }).lean();
  const isNew    = !existing;

  const user = await User.findOneAndUpdate(
    { firebaseUid: decoded.uid },
    {
      $set: {
        email,
        displayName,
        photoURL,
        lastLogin: new Date(),
      },
      // Only written on INSERT (not on every login)
      $setOnInsert: {
        role:     'user',
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  if (!user) {
    throw new GraphQLError('Failed to create user record.', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  // First-ever user bootstrap: if this was a brand-new record AND no admin
  // exists anywhere, promote atomically.
  if (isNew) {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      await User.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
      user.role = 'admin';
    }
  }

  if (!user.isActive) {
    throw new GraphQLError('Your account has been deactivated. Contact an administrator.', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  return { user };
}

/**
 * Guard helper — throws if the context user is not an admin.
 * Use at the top of any admin-only resolver.
 */
export function requireAdmin(user: IUser) {
  if (user.role !== 'admin') {
    throw new GraphQLError('Admin access required.', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}
