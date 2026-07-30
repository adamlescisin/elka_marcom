import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Vyplňte e-mail a heslo." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Nesprávný e-mail nebo heslo." }, { status: 401 });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return NextResponse.json({ error: "Nesprávný e-mail nebo heslo." }, { status: 401 });
    }

    const token = await createSession({ userId: user.id, email: user.email });
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, token);
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Chyba serveru." }, { status: 500 });
  }
}
