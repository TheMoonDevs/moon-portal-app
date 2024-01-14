import { prisma } from "@/lib/prisma";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "Credentials",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: "username", type: "text", placeholder: "jsmith" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials, req) {
        //console.log(credentials);
        if (!credentials?.username || !credentials?.password) {
          // Any object returned will be saved in `user` property of the JWT
          return null;
        }

        // You need to provide your own logic here that takes the credentials
        // submitted and returns either a object representing a user or value
        // that is false/null if the credentials are invalid.
        // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
        // You can also use the `req` object to obtain additional parameters
        // (i.e., the request IP address)

        const user = await prisma.user.findFirst({
          where: {
            username: credentials.username,
            password: credentials.password,
          },
        });
        //console.log(user)
        if (user?.id) return user;

        return null;
      },
    }),
    // ...add more providers here
  ],
  callbacks: {
    async session({ session, user, token }: any) {
      //console.log('session', session, user, token)
      if (token) {
        // session.accountId = token.accountId;

        const user = await prisma.user.findFirst({
          where: { id: token.accountId },
        });
        session.user = user;
      }
      return session;
    },
    async jwt({ token, user, account, profile, isNewUser }: any) {
      //console.log('jwt', user, account, profile, isNewUser)
      if (account) {
        token.accountId = account.providerAccountId;
        token.isAdmin = account.isAdmin;
      }
      return token;
    },
  },
};
export default NextAuth(authOptions);
