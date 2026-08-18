import { isValidPortalPassword } from "@/lib/bin-cleaning/password-policy";
import { serviceRoleDatabaseRequest } from "@/lib/supabase/server";

type CustomerIdentity = {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  stripe_customer_id: string | null;
  is_test: boolean;
};

type CheckoutAttempt = { signup_lead_id: string };
type SignupIdentity = { auth_user_id: string | null };
type AuthUser = { id: string; email?: string };
type AuthUsersResponse = { users?: AuthUser[] };

function stagingAuthConfiguration() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!["test", "staging"].includes(appEnv || "")) {
    throw new Error("Paid test Auth provisioning is allowed only in test or staging");
  }
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Paid test Auth provisioning is not configured");
  }
  return { supabaseUrl, serviceRoleKey };
}

async function findExistingAuthUser(supabaseUrl: string, serviceRoleKey: string, email: string) {
  for (let page = 1; page <= 5; page += 1) {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Could not inspect test Auth identities");
    const payload = await response.json() as AuthUsersResponse;
    const match = payload.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if ((payload.users?.length || 0) < 200) break;
  }
  return null;
}

async function preparedSignupIdentity(customer: CustomerIdentity) {
  if (!customer.stripe_customer_id) return null;
  const attempts = await serviceRoleDatabaseRequest<CheckoutAttempt[]>(
    `stripe_checkout_attempts?stripe_customer_id=eq.${encodeURIComponent(customer.stripe_customer_id)}&select=signup_lead_id&order=created_at.desc&limit=1`,
  ).catch(() => []);
  const leadId = attempts[0]?.signup_lead_id;
  if (!leadId) return null;
  const leads = await serviceRoleDatabaseRequest<SignupIdentity[]>(
    `signup_leads?id=eq.${encodeURIComponent(leadId)}&select=auth_user_id&limit=1`,
  ).catch(() => []);
  return leads[0]?.auth_user_id ?? null;
}

async function activateIdentity(customer: CustomerIdentity, authUserId: string) {
  await serviceRoleDatabaseRequest("user_profiles?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: authUserId,
      display_name: customer.full_name,
      phone: customer.phone,
      login_status: "active",
      is_test: true,
    }),
  });
  await serviceRoleDatabaseRequest(`customers?id=eq.${customer.id}&user_id=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ user_id: authUserId, account_status: "test_active" }),
  });
  return authUserId;
}

export async function provisionPaidStripeTestCustomerAuth(customerId: string) {
  const { supabaseUrl, serviceRoleKey } = stagingAuthConfiguration();
  const rows = await serviceRoleDatabaseRequest<CustomerIdentity[]>(
    `customers?id=eq.${encodeURIComponent(customerId)}&select=id,user_id,email,full_name,phone,stripe_customer_id,is_test&limit=1`,
  );
  const customer = rows[0];
  if (!customer?.is_test) throw new Error("Only fictional test customers can receive disposable test Auth");
  if (customer.user_id) return customer.user_id;
  if (!customer.email.toLowerCase().endsWith(".test")) throw new Error("Disposable paid test Auth requires a .test email address");

  const preparedAuthUserId = await preparedSignupIdentity(customer);
  if (preparedAuthUserId) {
    return activateIdentity(customer, preparedAuthUserId);
  }

  // Legacy staging records created before customer-chosen signup passwords can
  // still be completed with the shared test password. New signups should not
  // reach this fallback because checkout now requires auth_user_id on the lead.
  const password = process.env.ADS_TEST_USER_PASSWORD;
  if (!isValidPortalPassword(password)) {
    throw new Error("Paid test Auth provisioning is not configured");
  }

  let authUser: AuthUser | null = null;
  const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: customer.email,
      password,
      email_confirm: true,
      phone_confirm: false,
      user_metadata: { display_name: customer.full_name, ads_test_customer_id: customer.id },
    }),
    cache: "no-store",
  });

  if (createResponse.ok) {
    authUser = await createResponse.json() as AuthUser;
  } else if (createResponse.status === 422) {
    authUser = await findExistingAuthUser(supabaseUrl, serviceRoleKey, customer.email);
  }
  if (!authUser?.id) throw new Error("Could not provision disposable customer Auth identity");
  return activateIdentity(customer, authUser.id);
}
