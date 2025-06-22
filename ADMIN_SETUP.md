# LawMattersSG Admin Setup Guide

## User Roles System

The application has 5 user roles with different permission levels:

1. **`user`** - Regular users (default role)
   - Can ask questions, vote, bookmark content
   - Basic access to all public features

2. **`expert`** - Legal experts 
   - Can provide verified legal answers
   - Requires verification process
   - Enhanced profile with credentials

3. **`moderator`** - Content moderators
   - Can moderate Q&A content
   - Approve/reject questions and answers
   - Handle user reports

4. **`admin`** - System administrators
   - Full access to admin features
   - User management capabilities
   - System configuration

5. **`super_admin`** - Super administrators
   - Highest level access
   - Can promote other users to admin roles
   - Full system control

## Super Admin Setup Instructions

### Step 1: User Registration
The following users need to sign up through the application first:
- raymond.chai@8atoms.com
- 8thrives@gmail.com

**Sign up URL:** http://localhost:8082/auth/signup

### Step 2: Promote to Super Admin
After the users have signed up, run these SQL commands in Supabase:

```sql
-- Promote raymond.chai@8atoms.com to Super Admin
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'raymond.chai@8atoms.com';

-- Promote 8thrives@gmail.com to Super Admin  
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = '8thrives@gmail.com';

-- Verify the changes
SELECT email, role, first_name, last_name, created_at
FROM profiles 
WHERE role = 'super_admin'
ORDER BY created_at;
```

### Step 3: Verification
To confirm the Super Admin setup worked:

```sql
-- Check all admin-level users
SELECT 
  email, 
  role, 
  first_name, 
  last_name,
  created_at
FROM profiles 
WHERE role IN ('admin', 'super_admin')
ORDER BY role, created_at;
```

## Alternative: Direct Database Setup (Advanced)

If you need to create the users directly in the database without signup:

```sql
-- Create Super Admin profiles (requires manual auth.users creation)
INSERT INTO profiles (id, email, first_name, last_name, role)
VALUES 
  (gen_random_uuid(), 'raymond.chai@8atoms.com', 'Raymond', 'Chai', 'super_admin'),
  (gen_random_uuid(), '8thrives@gmail.com', 'Admin', 'User', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
```

**Note:** This approach requires corresponding entries in `auth.users` table which should be created through the Auth API.

## Super Admin Capabilities

Once promoted, Super Admins will have access to:

- **User Management**: Promote/demote user roles
- **Content Moderation**: Override all moderation decisions  
- **Expert Verification**: Approve/reject expert applications
- **System Configuration**: Modify system settings
- **Analytics Access**: View detailed system analytics
- **Database Access**: Direct database query capabilities (through admin panel)

## Security Notes

- Super Admin role should be limited to trusted individuals only
- All admin actions should be logged and auditable
- Consider implementing 2FA for admin accounts
- Regular review of admin permissions is recommended

## Troubleshooting

If users can't sign up:
1. Check if email confirmation is required
2. Verify SMTP settings in Supabase Auth
3. Check for any email domain restrictions

If role promotion fails:
1. Verify the user exists in profiles table
2. Check the email spelling exactly
3. Ensure the role constraint allows 'super_admin'
