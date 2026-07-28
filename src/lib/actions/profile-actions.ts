"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireInstitutionContext } from "../auth";
import { prisma } from "../prisma";
import { createClient } from "../supabase/server";

export async function updateOwnProfile(input: {
  fullName: string;
  username: string;
  currentPin: string;
  newPin?: string;
}) {
  const context = await requireInstitutionContext();
  const fullName = input.fullName.trim().slice(0, 200);
  const username = input.username.trim().toLowerCase();
  const currentPin = input.currentPin.trim();
  const newPin = String(input.newPin || "").trim();
  if (fullName.length < 2 || !/^[a-z0-9._-]{3,30}$/.test(username)) {
    return { success: false, error: "Nombre o usuario no válido." };
  }
  if (!/^\d{6}$/.test(currentPin) || (newPin && !/^\d{6}$/.test(newPin))) {
    return { success: false, error: "Los PIN deben contener exactamente 6 dígitos." };
  }
  const duplicate = await prisma.profile.findFirst({
    where: { username, id: { not: context.profile.id } },
    select: { id: true },
  });
  if (duplicate) return { success: false, error: "Ese nombre de usuario ya está en uso." };

  const sessionClient = await createClient();
  const verification = await sessionClient.auth.signInWithPassword({
    email: context.profile.email,
    password: currentPin,
  });
  if (verification.error) return { success: false, error: "El PIN actual no es correcto." };

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { success: false, error: "La administración de perfiles no está configurada." };
  const admin = createAdminClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `${username}@users.gymplan.app`;
  const authUpdate = await admin.auth.admin.updateUserById(context.profile.id, {
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, username },
    ...(newPin ? { password: newPin } : {}),
  });
  if (authUpdate.error) return { success: false, error: authUpdate.error.message };

  try {
    await prisma.$transaction([
      prisma.profile.update({
        where: { id: context.profile.id },
        data: { fullName, username, email },
      }),
      prisma.activityLog.create({
        data: {
          institutionId: context.institutionId,
          actorId: context.profile.id,
          action: "OWN_PROFILE_UPDATED",
          entityType: "Profile",
          entityId: context.profile.id,
          metadata: { username, pinChanged: Boolean(newPin) },
        },
      }),
    ]);
  } catch (error) {
    await admin.auth.admin.updateUserById(context.profile.id, {
      email: context.profile.email,
      email_confirm: true,
      user_metadata: { full_name: context.profile.fullName, username: context.profile.username },
      ...(newPin ? { password: currentPin } : {}),
    }).catch(() => undefined);
    console.error("No se pudo sincronizar el perfil:", error);
    return { success: false, error: "No se pudo guardar el perfil." };
  }
  revalidatePath("/profile");
  revalidatePath("/overview");
  return { success: true };
}
