"use server";

import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { prisma } from "../prisma";
import { createHash } from "node:crypto";

export type AuthState = { error?: string; message?: string } | undefined;

function normalizeUsername(value: FormDataEntryValue | null) {
  return String(value || "").trim().toLowerCase();
}

function usernameEmail(username: string) {
  return `${username}@users.gymplan.app`;
}

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const username = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") || "");
  if (!/^[a-z0-9._-]{3,30}$/.test(username) || password.length < 6) return { error: "Ingresa un usuario y una contraseña válidos." };

  const profile = await prisma.profile.findUnique({ where: { username }, select: { email: true, active: true } });
  if (!profile || !profile.active) return { error: "Usuario o contraseña incorrectos." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password });
  if (error) return { error: "Usuario o contraseña incorrectos." };
  redirect("/dashboard");
}

export async function signupAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("fullName") || "").trim();
  const username = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") || "");
  const inviteToken = String(formData.get("inviteToken") || "");
  if (fullName.length < 2) return { error: "Escribe el nombre completo del docente." };
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return { error: "El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const existing = await prisma.profile.findUnique({ where: { username }, select: { id: true } });
  if (existing) return { error: "Ese nombre de usuario ya está en uso." };

  const profileCount = await prisma.profile.count();
  const invitation = inviteToken ? await prisma.institutionInvitation.findUnique({
    where: { tokenHash: createHash("sha256").update(inviteToken).digest("hex") },
  }) : null;
  const validInvitation = invitation
    && !invitation.acceptedAt
    && invitation.expiresAt > new Date()
    && invitation.username === username;
  if (profileCount > 0 && !validInvitation) {
    return { error: "Necesitas una invitación institucional vigente para crear la cuenta." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: usernameEmail(username),
    password,
    options: { data: { full_name: fullName, username } },
  });
  if (error) return { error: error.message };
  if (!data.session) return { error: "Supabase todavía exige confirmar correo. Desactiva Confirm email para usar nombres de usuario." };
  if (data.user && validInvitation) {
    await prisma.$transaction([
      prisma.institutionMembership.deleteMany({ where: { profileId: data.user.id, institutionId: { not: invitation.institutionId } } }),
      prisma.institutionMembership.upsert({
        where: { institutionId_profileId: { institutionId: invitation.institutionId, profileId: data.user.id } },
        update: { role: invitation.role, status: "ACTIVE", deletedAt: null },
        create: { institutionId: invitation.institutionId, profileId: data.user.id, role: invitation.role, status: "ACTIVE" },
      }),
      prisma.institutionInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
    ]);
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
