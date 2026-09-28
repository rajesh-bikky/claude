import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ONE_YEAR = 60 * 60 * 24 * 365;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: {
    maxAge: ONE_YEAR, // long-lived, so the Home Screen icon stays signed in
  },
  callbacks: {
    async signIn({ profile }) {
      return profile?.email === process.env.ALLOWED_EMAIL;
    },
  },
});
