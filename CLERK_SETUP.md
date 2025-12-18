# Clerk Organizations Setup Guide

This guide will help you complete the setup of Clerk Organizations authentication for your multi-tenant platform.

## 📋 Prerequisites

- A Clerk account ([sign up here](https://clerk.com))
- Upstash Redis instance (already configured)
- Node.js and pnpm installed

## 🚀 Installation Steps

### 1. Install Dependencies

First, install the new dependencies:

```bash
pnpm install
```

This will install:
- `@clerk/nextjs` - Clerk's Next.js SDK
- `svix` - Webhook verification library

### 2. Configure Clerk Dashboard

1. **Enable Organizations:**
   - Go to your [Clerk Dashboard](https://dashboard.clerk.com/)
   - Navigate to **Settings** → **Organizations**
   - Click **Enable Organizations**
   - **Important:** Ensure organization slug is enabled and required - this slug will be used as the subdomain

2. **Set Up Roles (Optional):**
   - Go to **Organizations** → **Roles & Permissions**
   - Create an "admin" role for super admin users
   - This role will have access to the admin dashboard

3. **Configure Webhooks:**
   - Go to **Webhooks** in the Clerk Dashboard
   - Click **Add Endpoint**
   - Enter your webhook URL: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to these events:
     - `organization.created`
     - `organization.updated`
     - `organization.deleted`
   - Copy the **Signing Secret** (you'll need this for the `.env.local` file)

4. **Configure After Sign In/Up URLs (Optional):**
   - In Clerk Dashboard, go to **User & Authentication** → **Email, Phone, Username**
   - Scroll down to **Redirects** section
   - You can set custom redirect URLs here if needed, but this is optional
   - The app handles redirects programmatically, so you don't need to set:
     - After sign in URL
     - After sign up URL
   - Leave these blank or set to your homepage: `http://localhost:3000/` or `https://your-domain.com/`

### 3. Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Upstash Redis (already configured)
KV_REST_API_URL=your-redis-url
KV_REST_API_TOKEN=your-redis-token
```

**Where to find these values:**
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** and **CLERK_SECRET_KEY**: Found in Clerk Dashboard → **API Keys**
- **CLERK_WEBHOOK_SECRET**: Found when creating the webhook endpoint (step 2.3 above)

### 4. Assign Admin Role to Users

To give users access to the admin dashboard, you need to set their role to "admin":

1. Go to your Clerk Dashboard
2. Navigate to **Users**
3. Click on a user
4. Under **Public Metadata**, add:
   ```json
   {
     "role": "admin"
   }
   ```

Alternatively, you can use the Clerk API or do this programmatically.

## 🏗️ How It Works

### User Flow

1. **New User Visits Site:**
   - User lands on the homepage
   - They see a "Sign In / Sign Up" button
   - After signing in, they're redirected to create an organization

2. **Organization Creation:**
   - User creates an organization via Clerk's UI
   - **User must set an organization slug** - this becomes their subdomain
   - The organization slug from Clerk is used directly (not generated from name)
   - Organization data is automatically synced to Redis
   - User is redirected to their new subdomain

3. **Organization Member:**
   - When a user who belongs to an organization visits the site
   - They're automatically redirected to their organization's subdomain

### Admin Dashboard

- Only users with the "admin" role can access `/admin`
- Admin dashboard shows all organizations and their subdomains
- Admins can delete organizations/subdomains

### Subdomain Pages

- Each organization gets a subdomain based on their Clerk organization slug
- Example: Organization "Acme Corp" with Clerk slug "acme-corp" → `acme-corp.yourdomain.com`
- The slug is used directly from Clerk (not generated from the organization name)
- Subdomain pages are publicly accessible (no authentication required)
- **Important:** Users must set a slug when creating organizations in Clerk

## 📊 Redis Data Structure

The system stores data in Redis with the following structure:

```
org:{clerkOrgId} → {
  clerkOrgId: string,
  name: string,
  slug: string,
  createdAt: number
}

subdomain:{slug} → {
  organizationId: string,
  organizationName: string,
  organizationSlug: string,
  createdAt: number
}

orgSlugIndex:{slug} → clerkOrgId (for quick lookups)
```

## 🔄 Webhook Synchronization

Webhooks keep Redis in sync with Clerk:

- **organization.created**: Creates org in Redis and subdomain using Clerk's slug
- **organization.updated**: Updates org name/slug in Redis if changed in Clerk
- **organization.deleted**: Removes org and subdomain from Redis

This ensures data consistency even if organizations are created/modified directly in the Clerk Dashboard.

**Note:** The organization slug from Clerk is used directly as the subdomain - it is not generated from the organization name.

## 🧪 Testing

### Local Development

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Visit `http://localhost:3000`

3. For subdomain testing, you can use:
   - `http://your-org-slug.localhost:3000`
   - Or add entries to your `/etc/hosts` file

### Testing Webhooks Locally

Use ngrok to expose your local server:

1. In one terminal, start the dev server:
   ```bash
   pnpm dev
   ```

2. In another terminal, start ngrok:
   ```bash
   pnpm ngrok
   ```

3. Ngrok will display a forwarding URL like:
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```

4. Use that URL for your webhook endpoint in Clerk Dashboard:
   ```
   https://abc123.ngrok.io/api/webhooks/clerk
   ```

## 🚨 Troubleshooting

### Issue: "Organization already exists" error
**Solution:** The organization might already exist in Redis. Check your Redis data or delete the existing entry.

### Issue: Cannot access admin dashboard
**Solution:** Make sure your user has `"role": "admin"` in their public metadata in Clerk Dashboard.

### Issue: Webhook not working
**Solution:** 
- Verify the webhook secret is correct in `.env.local`
- Check the webhook URL is accessible from the internet
- Look at webhook logs in Clerk Dashboard for errors

### Issue: Subdomain not working locally
**Solution:** Use the format `subdomain.localhost:3000` or add entries to your hosts file.

## 📝 Key Files

- `middleware.ts` - Handles subdomain routing and authentication
- `app/page.tsx` - Homepage with sign-in flow
- `app/create-organization/page.tsx` - Organization creation page
- `app/org-setup-complete/page.tsx` - Post-creation sync handler
- `app/api/webhooks/clerk/route.ts` - Webhook handler
- `app/admin/page.tsx` - Admin dashboard (protected)
- `lib/organizations.ts` - Organization Redis operations
- `app/actions.ts` - Server actions for org sync

## 🎉 You're All Set!

Your platform now has full Clerk Organizations authentication with:
- ✅ Automatic subdomain creation from organization slugs
- ✅ Redis synchronization via webhooks
- ✅ Protected admin dashboard with role-based access
- ✅ Public subdomain pages for each organization

For more information, visit the [Clerk Documentation](https://clerk.com/docs).

