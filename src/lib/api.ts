import { NextResponse } from "next/server";
import { ZodError } from "zod";
import mongoose from "mongoose";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) return fail(e.issues.map((i) => i.message).join("; "), 422);
  console.error(e);
  return fail(e instanceof Error ? e.message : "Erro interno", 500);
}

export function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}
