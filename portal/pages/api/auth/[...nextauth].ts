import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { SignInError, verifyPortalSignIn } from '@/lib/auth/signIn';
import { isSuperAdminEmail } from '@/lib/permissions/superAdmin';

/*
 * Sign-in is a sign-in code plus a Google sign-in with an account linked to
 * that user; see lib/auth/signIn.ts. The mobile app signs in the same way
 * through /api/mobile/auth/sign-in.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Passcode + Google',
      credentials: {
        code: { label: 'code', type: 'password' },
        idToken: { label: 'idToken', type: 'text' },
      },
      async authorize(credentials) {
        let user;
        let googleEmail: string;
        try {
          ({ user, googleEmail } = await verifyPortalSignIn(
            credentials?.code,
            credentials?.idToken,
          ));
        } catch (e) {
          if (e instanceof SignInError) throw new Error(e.code);
          throw e;
        }

        return {
          id: String(user.id),
          name: user.name || user.username,
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
