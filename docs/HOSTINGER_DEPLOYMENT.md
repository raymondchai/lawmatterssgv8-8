# Hostinger Deployment Guide for LawMattersSG

This guide will help you deploy LawMattersSG to Hostinger hosting, which offers excellent value and performance for Singapore-based applications.

## 🎯 Why Hostinger for LawMattersSG?

### Advantages:
- **Cost Effective**: $2-4/month vs $20/month for Vercel Pro
- **Asia-Pacific Servers**: Better latency for Singapore users
- **Email Hosting Included**: Professional email addresses
- **Full Control**: SSH access, custom configurations
- **No Vendor Lock-in**: Standard hosting, easy to migrate
- **Unlimited Bandwidth**: No usage-based pricing

### Perfect for Your App Because:
- ✅ Static React/Vite build (no server-side rendering needed)
- ✅ External APIs (Supabase, OpenAI, Stripe)
- ✅ File storage via Supabase (no server storage needed)
- ✅ Simple deployment process

## 📋 Prerequisites

1. **Hostinger Account**: Sign up at hostinger.com
2. **Domain Name**: Purchase or transfer your domain
3. **Production Build**: Ensure your app builds successfully

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Build

```bash
# Install dependencies
npm install

# Create production build
npm run build

# Verify build output
ls -la dist/
```

### Step 2: Hostinger Setup

1. **Login to Hostinger hPanel**
2. **Go to File Manager**
3. **Navigate to public_html directory**
4. **Delete default files** (index.html, etc.)

### Step 3: Upload Your Files

**Option A: File Manager (Easy)**
1. Compress your `dist` folder: `zip -r lawmatters-build.zip dist/*`
2. Upload zip file to `public_html`
3. Extract the zip file
4. Move all files from `dist` folder to `public_html` root

**Option B: FTP/SFTP (Recommended)**
```bash
# Using FileZilla or similar FTP client
Host: your-domain.com
Username: your-hostinger-username
Password: your-hostinger-password
Port: 21 (FTP) or 22 (SFTP)

# Upload all files from dist/ to public_html/
```

**Option C: Git Deployment (Advanced)**
```bash
# SSH into your Hostinger account
ssh your-username@your-domain.com

# Clone your repository
git clone https://github.com/your-username/lawmatterssgv8-8.git
cd lawmatterssgv8-8

# Install Node.js (if not available)
# Build your project
npm install
npm run build

# Copy build files to public_html
cp -r dist/* ../public_html/
```

### Step 4: Configure Environment Variables

Since this is a static site, environment variables are built into the app. Create a production build with the correct variables:

1. **Create `.env.production`**:
```env
VITE_APP_NAME=LawMattersSG
VITE_APP_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api
VITE_ENVIRONMENT=production

# Supabase (Production)
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# External Services
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
VITE_POSTHOG_KEY=your-posthog-key
```

2. **Build with production environment**:
```bash
npm run build
```

3. **Upload the new build**

### Step 5: Configure Domain & SSL

1. **Domain Setup**:
   - Point your domain to Hostinger nameservers
   - Or update DNS A record to Hostinger IP

2. **SSL Certificate**:
   - Go to hPanel → SSL
   - Enable "Force HTTPS"
   - Certificate is automatically generated

### Step 6: Configure URL Redirects

Create `.htaccess` file in `public_html`:

```apache
# Enable HTTPS redirect
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Handle React Router (SPA)
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security Headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache Control
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

## 🔧 Hostinger-Specific Optimizations

### 1. Enable Cloudflare (Free)
- Hostinger offers free Cloudflare integration
- Improves global performance
- Additional security features

### 2. Set up Email Hosting
```
# Professional email addresses
admin@lawmatterssg.com
support@lawmatterssg.com
noreply@lawmatterssg.com
```

### 3. Database Backup (if needed)
- While you use Supabase, set up regular backups
- Hostinger provides backup services

## 📊 Performance Optimization

### 1. File Compression
Your build already includes:
- Minified JavaScript/CSS
- Gzipped assets
- Optimized images

### 2. CDN Configuration
- Enable Cloudflare through Hostinger
- Configure caching rules
- Optimize for Singapore/Asia-Pacific

### 3. Monitoring Setup
```javascript
// Add to your app for monitoring
if (typeof window !== 'undefined') {
  // Performance monitoring
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart);
  });
}
```

## 🚨 Troubleshooting

### Common Issues:

1. **404 Errors on Refresh**
   - Ensure `.htaccess` is configured correctly
   - Check React Router setup

2. **Environment Variables Not Working**
   - Rebuild with correct `.env.production`
   - Verify VITE_ prefix on variables

3. **SSL Issues**
   - Wait 24-48 hours for SSL propagation
   - Clear browser cache

4. **Slow Loading**
   - Enable Cloudflare
   - Optimize images
   - Check server location

## 🔄 Deployment Automation

Create a deployment script for easier updates:

```bash
#!/bin/bash
# deploy-to-hostinger.sh

echo "🚀 Deploying LawMattersSG to Hostinger..."

# Build the project
npm run build

# Create deployment package
zip -r lawmatters-$(date +%Y%m%d-%H%M%S).zip dist/*

echo "✅ Build complete! Upload the zip file to Hostinger File Manager"
echo "📁 Extract to public_html and replace existing files"
```

## 📈 Post-Deployment Checklist

- [ ] Test all pages load correctly
- [ ] Verify authentication works
- [ ] Test file uploads
- [ ] Check payment processing
- [ ] Verify email functionality
- [ ] Test on mobile devices
- [ ] Check page load speeds
- [ ] Verify SSL certificate
- [ ] Test from Singapore IP

## 💰 Cost Comparison

**Hostinger Premium**: ~$3/month
- Unlimited bandwidth
- 100GB storage
- Free SSL
- Email hosting
- 24/7 support

**Vercel Pro**: $20/month per member
- 1TB bandwidth
- Serverless functions
- Edge network
- Team collaboration

**For LawMattersSG**: Hostinger saves ~$200/year while providing everything you need!

## 🆘 Support

**Hostinger Support**:
- 24/7 live chat
- Knowledge base
- Video tutorials
- Community forum

**Additional Resources**:
- Hostinger hPanel documentation
- React deployment guides
- Vite production build guides
