# How to Login as App Admin (Superuser)

## Current Superuser Status

There is **1 superuser** in the database:
- **Email**: `admin@test.com`
- **Status**: Active and Email Verified

**Note**: The password is not known. You'll need to reset it or create a new superuser.

---

## Option 1: Create/Reset Superuser Password (Recommended)

Use the provided script to create a new superuser or reset the password for an existing one:

### Method A: Interactive (Prompts for input)

```bash
docker compose exec backend python scripts/create_superuser.py
```

You'll be prompted for:
- Email (e.g., `admin@test.com` or a new email)
- Password (will be hidden)
- Confirm password
- First name (optional)
- Last name (optional)

### Method B: Using Environment Variables

```bash
# Set environment variables
export SUPERUSER_EMAIL="admin@test.com"
export SUPERUSER_PASSWORD="YourSecurePassword123!"
export SUPERUSER_FIRST_NAME="Admin"
export SUPERUSER_LAST_NAME="User"

# Run script
docker compose exec backend python scripts/create_superuser.py
```

### Method C: One-liner with environment variables

```bash
docker compose exec -e SUPERUSER_EMAIL="admin@test.com" -e SUPERUSER_PASSWORD="YourSecurePassword123!" backend python scripts/create_superuser.py
```

---

## Option 2: Create a New Superuser Account

If you want to create a completely new admin account:

```bash
docker compose exec backend python scripts/create_superuser.py
```

Then enter:
- **Email**: `admin@yourdomain.com` (or any email you prefer)
- **Password**: Choose a secure password
- **Name**: Optional

---

## Option 3: Use Existing Superuser (If Password is Known)

If you know the password for `admin@test.com`, simply:

1. Go to `http://localhost/login` (or `https://onebrat.xyz/login`)
2. Enter:
   - **Email**: `admin@test.com`
   - **Password**: (your known password)
3. Click "Login"

---

## After Creating/Resetting Superuser

### 1. Login via Web UI

1. Open `http://localhost/login`
2. Enter your superuser email and password
3. You'll be redirected to the dashboard

### 2. Verify Superuser Status

Once logged in, you can verify you're a superuser by:

**Via API:**
```bash
# Get your token first
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"YourPassword"}' \
  | jq -r '.access_token')

# Check your user info
curl -X GET http://localhost/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '.is_superuser'
```

**Via Frontend:**
- When creating a tenant, you should see an "Owner" dropdown (superuser-only feature)
- You can access `/api/admin/*` endpoints

### 3. Test Superuser Features

**Admin Endpoints** (superuser only):
```bash
# List all users
curl -X GET http://localhost/api/admin/users \
  -H "Authorization: Bearer $TOKEN"

# List all tenants
curl -X GET http://localhost/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN"

# Get platform stats
curl -X GET http://localhost/api/admin/stats \
  -H "Authorization: Bearer $TOKEN"

# Create tenant with owner assignment
curl -X POST "http://localhost/api/admin/tenants?owner_id={user-id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Created Tenant",
    "email": "contact@tenant.com"
  }'
```

**Frontend Features:**
- When creating a tenant (`/tenants/new`), you'll see an "Owner" dropdown to assign any user as owner
- You can create tenants and assign them to any user

---

## Quick Start: Create Admin Account Now

**Fastest way to get an admin account:**

```bash
# Reset password for existing admin@test.com
docker compose exec backend python scripts/create_superuser.py
```

When prompted:
1. Email: `admin@test.com` (or press Enter to use default)
2. Password: Enter your desired password
3. Confirm password: Enter again
4. First/Last name: Optional

Then login at `http://localhost/login` with:
- Email: `admin@test.com`
- Password: (the password you just set)

---

## Troubleshooting

### "User already exists" but password doesn't work
- Use the script to reset the password (Option 1)

### "Permission denied" when accessing admin endpoints
- Verify `is_superuser` is `True` in the database
- Check your JWT token is valid
- Make sure you're using the correct user account

### Script fails with import errors
- Make sure you're running it inside the Docker container: `docker compose exec backend python scripts/create_superuser.py`
- Check that the backend container is running: `docker compose ps`

---

## Security Note

⚠️ **Important**: After creating/resetting the admin password, make sure to:
1. Use a strong password
2. Change it regularly
3. Don't share it publicly
4. Consider using environment variables for production

---

## Summary

**To login as admin:**

1. **Create/Reset superuser**:
   ```bash
   docker compose exec backend python scripts/create_superuser.py
   ```

2. **Login at**: `http://localhost/login`
   - Use the email and password you just set

3. **Verify**: Check that you can access admin features (owner dropdown when creating tenants)

That's it! 🎉

