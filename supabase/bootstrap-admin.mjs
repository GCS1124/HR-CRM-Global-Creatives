import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "test@crm.co.in";
const ADMIN_PASSWORD = "@12131415@";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required environment variables.");
  console.error("Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function ensureAdminUser() {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Unable to list users: ${listError.message}`);
  }

  const existing = listData.users.find((user) => user.email?.toLowerCase() === ADMIN_EMAIL);

  if (existing) {
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "CRM Super Admin",
      },
    });

    if (updateError) {
      throw new Error(`Unable to update admin user: ${updateError.message}`);
    }

    return updatedUser.user.id;
  }

  const { data: createdData, error: createError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: "CRM Super Admin",
    },
  });

  if (createError || !createdData.user) {
    throw new Error(`Unable to create admin user: ${createError?.message ?? "Unknown error"}`);
  }

  return createdData.user.id;
}

async function enforceRoleModel(adminUserId) {
  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, email, role");

  if (profilesError) {
    throw new Error(`Unable to fetch profiles: ${profilesError.message}`);
  }

  for (const profile of profiles ?? []) {
    const targetRole = profile.email?.toLowerCase() === ADMIN_EMAIL ? "admin" : "employee";

    if (profile.role !== targetRole) {
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: targetRole })
        .eq("id", profile.id);

      if (roleError) {
        throw new Error(`Unable to enforce role for ${profile.email}: ${roleError.message}`);
      }
    }
  }

  const { error: upsertProfileError } = await supabase.from("profiles").upsert(
    {
      id: adminUserId,
      email: ADMIN_EMAIL,
      full_name: "CRM Super Admin",
      role: "admin",
    },
    { onConflict: "id" },
  );

  if (upsertProfileError) {
    throw new Error(`Unable to upsert admin profile: ${upsertProfileError.message}`);
  }
}

async function ensureAdminEmployeeRecord(adminUserId) {
  const { data: existingEmployee, error: selectError } = await supabase
    .from("employees")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();

  if (selectError && selectError.code !== "PGRST116") {
    throw new Error(`Unable to check admin employee record: ${selectError.message}`);
  }

  if (existingEmployee?.id) {
    const { error: updateError } = await supabase
      .from("employees")
      .update({
        user_id: adminUserId,
        role: "System Administrator",
        department: "Administration",
        manager: "Board",
        status: "active",
        performance_score: 99,
      })
      .eq("id", existingEmployee.id);

    if (updateError) {
      throw new Error(`Unable to update admin employee record: ${updateError.message}`);
    }

    return;
  }

  const { error: insertError } = await supabase.from("employees").insert({
    id: "EMP-0001",
    user_id: adminUserId,
    name: "CRM Super Admin",
    email: ADMIN_EMAIL,
    role: "System Administrator",
    department: "Administration",
    location: "Remote",
    join_date: "2024-01-01",
    manager: "Board",
    status: "active",
    performance_score: 99,
  });

  if (insertError) {
    throw new Error(`Unable to insert admin employee record: ${insertError.message}`);
  }
}

async function main() {
  const adminUserId = await ensureAdminUser();
  await enforceRoleModel(adminUserId);
  await ensureAdminEmployeeRecord(adminUserId);

  console.log("Admin bootstrap complete.");
  console.log(`Admin email: ${ADMIN_EMAIL}`);
  console.log("All non-admin profiles are enforced as employee.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
