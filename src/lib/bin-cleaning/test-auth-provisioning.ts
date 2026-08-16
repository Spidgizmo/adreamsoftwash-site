import { serviceRoleDatabaseRequest } from "@/lib/supabase/server";

type CustomerIdentity = {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  is_test: boolean;
};

type AuthUser = { id: string; email?: string };
type AuthUsersResponse = { users?: AuthUser[] };

function testAuthConfiguration() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const password = process.env.ADS_TEST_USER_PASSWORD;
  if (!['test', 'staging'].includes(appEnv || '')) throw new Error('Paid test Auth provisioning is allowed only in test or staging');
  if (!supabaseUrl || !serviceRoleKey || !password || password.length < 8) {
    throw new Error('Paid test Auth provisioning is not configured');
  }
  return { supabaseUrl, serviceRoleKey, password };
}

async function findExistingAuthUser(supabaseUrl: string, serviceRoleKey: string, email: string) {
  for (let page = 1; page <= 5; page += 1) {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Could not inspect test Auth identities');
    const payload = await response.json() as AuthUsersResponse;
    const match = payload.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if ((payload.users?.length || 0) < 200) break;
  }
  return null;
}

export async function provisionPaidStripeTestCustomerAuth(customerId: string) {
  const { supabaseUrl, serviceRoleKey, password } = testAuthConfiguration();
  const rows = await serviceRoleDatabaseRequest<CustomerIdentity[]>(
    `customers?id=eq.${encodeURIComponent(customerId)}&select=id,user_id,email,full_name,phone,is_test&limit=1`,
  );
  const customer = rows[0];
  if (!customer?.is_test) throw new Error('Only fictional test customers can receive disposable test Auth');
  if (customer.user_id) return customer.user_id;
  if (!customer.email.toLowerCase().endsWith('.test')) throw new Error('Disposable paid test Auth requires a .test email address');

  let authUser: AuthUser | null = null;
  const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: customer.email,
      password,
      email_confirm: true,
      phone_confirm: false,
      user_metadata: { display_name: customer.full_name, ads_test_customer_id: customer.id },
    }),
    cache: 'no-store',
  });

  if (createResponse.ok) {
    authUser = await createResponse.json() as AuthUser;
  } else if (createResponse.status === 422) {
    authUser = await findExistingAuthUser(supabaseUrl, serviceRoleKey, customer.email);
  }
  if (!authUser?.id) throw new Error('Could not provision disposable customer Auth identity');

  await serviceRoleDatabaseRequest('user_profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: authUser.id,
      display_name: customer.full_name,
      phone: customer.phone,
      login_status: 'active',
      is_test: true,
    }),
  });
  await serviceRoleDatabaseRequest(`customers?id=eq.${customer.id}&user_id=is.null`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: authUser.id, account_status: 'test_active' }),
  });
  return authUser.id;
}
