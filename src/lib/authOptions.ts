import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import { UserModel } from "@/models/User";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 dias
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;
        await connectDB();
        const user = await UserModel.findOne({ email }).select("+passwordHash").lean();
        if (!user) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return { id: String(user._id), name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
};
