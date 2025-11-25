# Vercel Deployment Guide

This guide explains how to deploy and configure the ArchBridge SyncFlow Server on Vercel.

## Prerequisites

- A Vercel account ([vercel.com](https://vercel.com))
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Supabase project with migrations applied

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):

   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:

   ```bash
   vercel login
   ```

3. **Deploy to Preview**:

   ```bash
   vercel
   ```

   Follow the prompts to link your project.

4. **Deploy to Production**:

   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. **Push your code** to GitHub/GitLab/Bitbucket

2. **Import Project**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your repository
   - Vercel will auto-detect the project settings

3. **Configure Build Settings** (if needed):
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Deploy**: Click "Deploy"

## Environment Variables Configuration

Configure the following environment variables in Vercel Dashboard:

**Project Settings → Environment Variables**

### Required Variables

- `SUPABASE_URL` - Your Supabase project URL
  - Example: `https://xxxxx.supabase.co`
  
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
  - Found in: Supabase Dashboard → Settings → API → service_role key

### Optional Variables (Fallback Values)

These are only used if no active configuration is set via API:

- `ARDOQ_API_TOKEN` - Ardoq API token
- `ARDOQ_API_HOST` - Ardoq API host (default: `https://app.ardoq.com`)
- `ARDOQ_ORG_LABEL` - Ardoq organization label
- `AZURE_DEVOPS_PAT_TOKEN` - Azure DevOps PAT token
- `AZURE_DEVOPS_ORGANIZATION` - Azure DevOps organization name

### Setting Environment Variables

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for the appropriate environments:
   - **Production**: Production deployments
   - **Preview**: Preview deployments (pull requests, branches)
   - **Development**: Local development (if using `vercel dev`)

4. **Important**: After adding/changing environment variables, redeploy your application for changes to take effect.

## Project Configuration

The project includes a `vercel.json` configuration file that:

- Routes all requests to the Express server
- Uses `@vercel/node` runtime
- Sets `NODE_ENV=production` automatically

### File Structure for Vercel

```
ArchBridge-SyncFlow-Server/
├── vercel.json          # Vercel configuration
├── package.json         # Includes vercel-build script
├── src/
│   └── server.ts        # Exports app for Vercel
└── dist/                # Build output (auto-generated)
```

## Verification

After deployment, verify your deployment:

1. **Check Root Endpoint**:

   ```
   https://your-project.vercel.app/
   ```

   Should return:

   ```json
   {
     "message": "Welcome to ArchBridge SyncFlow Server",
     "status": "running",
     "version": "1.0.0"
   }
   ```

2. **Check Health Endpoint**:

   ```
   https://your-project.vercel.app/health
   ```

   Should return:

   ```json
   {
     "status": "healthy",
     "timestamp": "2024-..."
   }
   ```

3. **Check API Endpoints**:

   ```
   https://your-project.vercel.app/api
   ```

   Should return a list of available API endpoints.

## Troubleshooting

### Build Fails

- **Issue**: TypeScript compilation errors
- **Solution**: Run `npm run build` locally to check for errors
- **Check**: Ensure all dependencies are in `package.json`

### 404 Errors

- **Issue**: Routes not found
- **Solution**: Verify `vercel.json` routes point to `dist/server.js`
- **Check**: Ensure build completed successfully

### Environment Variables Not Working

- **Issue**: Variables not accessible in runtime
- **Solution**:
  1. Verify variables are set in Vercel Dashboard
  2. Redeploy after adding/changing variables
  3. Check variable names match exactly (case-sensitive)

### Function Timeout

- **Issue**: Requests timing out
- **Solution**:
  - Vercel Hobby plan: 10-second timeout
  - Vercel Pro plan: 60-second timeout
  - Consider optimizing long-running operations
  - Use background jobs for heavy processing

### CORS Issues

- **Issue**: CORS errors from frontend
- **Solution**: Update CORS middleware in `src/server.ts` to allow your frontend domain

## Local Development with Vercel

You can test Vercel configuration locally:

```bash
# Install Vercel CLI
npm i -g vercel

# Run local development server
vercel dev
```

This will:

- Use Vercel's routing
- Load environment variables from `.env.local`
- Simulate serverless function behavior

## Database Setup

Before deploying, ensure your Supabase database has all migrations applied:

1. Run `supabase-migration.sql` - Creates Ardoq configurations table
2. Run `supabase-azure-devops-migration.sql` - Creates Azure DevOps configurations table
3. Run `supabase-field-mapping-migration.sql` - Creates field mapping tables
4. Run `supabase-sync-history-migration.sql` - Creates sync history tables

## Custom Domain

To use a custom domain:

1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificates are automatically provisioned

## Monitoring and Logs

- **Logs**: View in Vercel Dashboard → **Deployments** → Click on deployment → **Functions** tab
- **Analytics**: Available in Vercel Dashboard (Pro plan)
- **Real-time Logs**: Use `vercel logs` CLI command

## Performance Considerations

- **Cold Starts**: First request may be slower (serverless function initialization)
- **Warm Functions**: Subsequent requests are faster
- **Caching**: Consider implementing response caching for frequently accessed data
- **Database Connections**: Supabase client handles connection pooling automatically

## Security Best Practices

1. **Never commit** `.env` files or sensitive keys
2. **Use Environment Variables** in Vercel Dashboard for all secrets
3. **Rotate Keys** regularly
4. **Use Service Role Key** only on server-side (never expose to client)
5. **Enable Vercel Authentication** for team access control

## Support

For issues:

1. Check Vercel deployment logs
2. Review [Vercel Documentation](https://vercel.com/docs)
3. Check project-specific documentation in `/docs` folder
