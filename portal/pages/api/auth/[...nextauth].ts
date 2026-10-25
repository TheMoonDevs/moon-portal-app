import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import {
  getSignInEmails,
  GoogleTokenError,
  verifyGoogleIdToken,
} from '@/lib/auth/googleIdToken';
import { LOGIN_ERRORS } from '@/lib/auth/loginErrors';
import { db } from '@/lib/mongodb/db-client';
import { isSuperAdminEmail } from '@/lib/permissions/superAdmin';

/*
 * Sign-in needs two things together:
 *   1. the person's portal code (username + password, e.g. ABC123), and
 *   2. a Google sign-in with ANY Google account linked to that user
 *      (their primary email or one of `linkedEmails`).
 * The Google token is verified on the server, so a code alone never opens a
 * session.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Passcode + Google',
      credentials: {
        username: { label: 'username', type: 'text' },
        password: { label: 'password', type: 'password' },
        idToken: { label: 'idToken', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error(LOGIN_ERRORS.INVALID_CODE);
        }
        if (!credentials.idToken) {
          throw new Error(LOGIN_ERRORS.GOOGLE_FAILED);
        }

        const user = await db.user.findFirst({
          where: {
            username: credentials.username,
            password: credentials.password,
          },
        });
        if (!user) throw new Error(LOGIN_ERRORS.INVALID_CODE);
        if (user.status && user.status !== 'ACTIVE') {
          throw new Error(LOGIN_ERRORS.INACTIVE);
        }

        let googleEmail: string;
        try {
          googleEmail = await verifyGoogleIdToken(credentials.idToken);
        } catch (e) {
          if (e instanceof GoogleTokenError) {
            throw new Error(LOGIN_ERRORS.GOOGLE_FAILED);
          }
          throw e;
        }

        if (!getSignInEmails(user).includes(googleEmail)) {
          throw new Error(LOGIN_ERRORS.EMAIL_NOT_LINKED);
        }

        return {
          id: String(user.id),
          name: user.name ?? user.username,
          email: user.email ?? googleEmail,
          googleEmail,
        } as any;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: any) {
      if (token) {
        session.user = {
          name: token?.name,
          email: token?.email,
          id: token?.accountId,
          googleEmail: token?.googleEmail ?? null,
          isSuperAdmin: isSuperAdminEmail(token?.googleEmail),
        };
      }
      return session;
    },
    async jwt({ token, user, account }: any) {
      if (account) {
        token.accountId = account.providerAccountId;
      }
      if (user?.googleEmail) {
        token.googleEmail = user.googleEmail;
      }
      return token;
    },
  },
};

export default NextAuth(authOptions);
