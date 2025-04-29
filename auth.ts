import NextAuth from "next-auth";
import "next-auth/jwt";
import sql from "mssql";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: !!process.env.AUTH_DEBUG,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      if (pathname === "/middleware-example") return !!auth;
      return true;
    },
    jwt({ token, trigger, session, account }) {
      if (trigger === "update") token.name = session.user.name;

      const setup = {
        user: process.env.MSSQL_USER,
        password: process.env.MSSQL_PASSWORD,
        server: process.env.MSSQL_SERVER || "localhost",
        database: process.env.MSSQL_DATABASE,
        options: {
          trustServerCertificate: true, // Set to true if using self-signed certificates
        },
      };

      const pool = new sql.ConnectionPool(setup);

      pool.connect().then((c) => {
        const request = new sql.Request(c);
        c.close();
      });

      return token;
    },
    async session({ session, token }) {
      if (token?.accessToken) session.accessToken = token.accessToken;

      return session;
    },
  },
  experimental: { enableWebAuthn: true },
});

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}
