# Deployment Runbook - Tournament Platform V1

**Project:** Tournament Platform (saas202520)
**Version:** V1 (Online-Only)
**Target:** Azure App Service + PostgreSQL
**Last Updated:** 2025-11-15

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development Deployment](#development-deployment)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Procedure](#rollback-procedure)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Azure CLI** 2.50+ - `az --version`
- **Node.js** 20+ - `node --version`
- **pnpm** 10+ - `pnpm --version`
- **Git** - `git --version`

### Required Access

- Azure subscription with Contributor role
- GitHub repository access (for CI/CD)
- Database credentials or ability to create Azure PostgreSQL

### Pre-Flight Checklist

- [ ] Azure CLI authenticated (`az login`)
- [ ] Correct subscription selected (`az account set`)
- [ ] Environment variables prepared (see `.env.example`)
- [ ] Database connection string available
- [ ] All secrets ready (AUTH_SECRET, etc.)

---

## Environment Setup

### 1. Generate Secrets

```bash
# Generate AUTH_SECRET (32-byte random string)
openssl rand -base64 32

# Save this value - you'll need it in environment variables
```

### 2. Prepare Environment Variables

**Required for V1:**

```bash
DATABASE_URL="postgresql://user:password@host:5432/tournament_platform"
AUTH_SECRET="<generated-secret-from-above>"
NEXTAUTH_URL="https://your-app-name.azurewebsites.net"
NODE_ENV="production"
```

**Optional (enable as needed):**

```bash
# Email notifications
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="app-specific-password"
SMTP_FROM='"Tournament Platform" <noreply@tournament.com>'

# Redis (for caching - V2)
REDIS_URL="redis://username:password@host:6379"

# Stripe (for payments)
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

---

## Development Deployment

### Option 1: Azure Portal (Quickest)

**Step 1: Create Resource Group**

```bash
az group create \
  --name rg-vrd-202520-dev-eus2-app \
  --location eastus2
```

**Step 2: Create PostgreSQL Database**

Via Azure Portal:

1. Navigate to Azure Portal → Create Resource
2. Search "Azure Database for PostgreSQL"
3. Select "Flexible Server"
4. Configure:
   - Resource group: `rg-vrd-202520-dev-eus2-app`
   - Server name: `sqlsvr-vrd-202520-dev-eus2`
   - Region: East US 2
   - PostgreSQL version: 16
   - Compute + storage: Burstable, B1ms (1 vCore, 2GB RAM) - ~$12/month
   - Admin username: `tournamentadmin`
   - Password: (generate strong password)
   - Networking: Allow Azure services, add your IP
5. Create database: `tournament_platform`

**Step 3: Create App Service**

Via Azure Portal:

1. Navigate to Create Resource → Web App
2. Configure:
   - Resource group: `rg-vrd-202520-dev-eus2-app`
   - Name: `app-vrd-202520-dev-eus2-01`
   - Publish: Code
   - Runtime stack: Node 20 LTS
   - Region: East US 2
   - App Service Plan: B1 (Basic) - ~$13/month
3. Create

**Step 4: Configure Environment Variables**

In App Service → Settings → Environment variables:

```
DATABASE_URL = postgresql://tournamentadmin:password@sqlsvr-vrd-202520-dev-eus2.postgres.database.azure.com:5432/tournament_platform?sslmode=require
AUTH_SECRET = <your-generated-secret>
NEXTAUTH_URL = https://app-vrd-202520-dev-eus2-01.azurewebsites.net
NODE_ENV = production
```

**Step 5: Deploy Code**

```bash
cd apps/web

# Build locally first to verify
pnpm install
pnpm db:generate
pnpm build

# Deploy to Azure
az webapp up \
  --name app-vrd-202520-dev-eus2-01 \
  --resource-group rg-vrd-202520-dev-eus2-app \
  --runtime "NODE:20-lts"
```

**Step 6: Run Database Migrations**

```bash
# SSH into App Service or use Azure Cloud Shell
az webapp ssh --name app-vrd-202520-dev-eus2-01 \
  --resource-group rg-vrd-202520-dev-eus2-app

# Inside SSH session
cd /home/site/wwwroot
npx prisma migrate deploy
npx prisma db seed  # Optional: Load sample data
```

---

### Option 2: Infrastructure as Code (Bicep)

**Step 1: Create Resource Groups**

```bash
cd infrastructure/bicep

az deployment sub create \
  --location eastus2 \
  --template-file main.bicep \
  --parameters env=dev location=eastus2 slice=app
```

**Step 2: Deploy Database and App Service**

Currently manual (V2 will automate this). Use Azure Portal or CLI:

```bash
# Create PostgreSQL
az postgres flexible-server create \
  --resource-group rg-vrd-202520-dev-eus2-data \
  --name sqlsvr-vrd-202520-dev-eus2 \
  --location eastus2 \
  --admin-user tournamentadmin \
  --admin-password <strong-password> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --storage-size 32

# Create database
az postgres flexible-server db create \
  --resource-group rg-vrd-202520-dev-eus2-data \
  --server-name sqlsvr-vrd-202520-dev-eus2 \
  --database-name tournament_platform

# Create App Service Plan
az appservice plan create \
  --name asp-vrd-202520-dev-eus2 \
  --resource-group rg-vrd-202520-dev-eus2-app \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name app-vrd-202520-dev-eus2-01 \
  --resource-group rg-vrd-202520-dev-eus2-app \
  --plan asp-vrd-202520-dev-eus2 \
  --runtime "NODE:20-lts"
```

**Step 3: Configure and Deploy**

Same as Option 1, Steps 4-6.

---

## Staging Deployment

**Follow same process as Development, but use:**

- Environment: `stg`
- Resource groups: `rg-vrd-202520-stg-eus2-*`
- App Service: `app-vrd-202520-stg-eus2-01`
- Database: `sqlsvr-vrd-202520-stg-eus2`
- NEXTAUTH_URL: `https://app-vrd-202520-stg-eus2-01.azurewebsites.net`

**Recommended Tier Upgrades:**

- App Service Plan: S1 (Standard) - ~$70/month
- PostgreSQL: General Purpose, D2s_v3 - ~$80/month

---

## Production Deployment

### Pre-Production Checklist

- [ ] All staging tests passed
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Backup strategy defined
- [ ] Monitoring and alerts configured
- [ ] Custom domain and SSL ready
- [ ] Secrets rotated and secured in Key Vault

### Production Infrastructure

**Recommended Configuration:**

**Resource Groups:**

```bash
rg-vrd-202520-prd-eus2-app   # App resources
rg-vrd-202520-prd-eus2-data  # Database
rg-vrd-202520-prd-eus2-net   # Network resources
```

**App Service:**

- Tier: P1v2 (Premium) - ~$146/month
- Auto-scaling: Min 2 instances, Max 10
- Deployment slots: Enabled (staging slot)

**Database:**

- Tier: General Purpose, D4s_v3 (4 vCores, 16GB RAM) - ~$280/month
- High Availability: Zone-redundant
- Backup retention: 35 days
- Point-in-time restore: Enabled

**Additional Services:**

- Application Insights (monitoring)
- Key Vault (secrets management)
- Azure Front Door (CDN + WAF) - Optional
- Azure Cache for Redis (caching) - V2

### Deployment Steps

**1. Create Infrastructure:**

```bash
cd infrastructure/bicep

# Create resource groups
az deployment sub create \
  --location eastus2 \
  --template-file main.bicep \
  --parameters env=prd location=eastus2 slice=app

# Create database (production tier)
az postgres flexible-server create \
  --resource-group rg-vrd-202520-prd-eus2-data \
  --name sqlsvr-vrd-202520-prd-eus2 \
  --location eastus2 \
  --admin-user tournamentadmin \
  --admin-password <strong-password> \
  --sku-name Standard_D4s_v3 \
  --tier GeneralPurpose \
  --version 16 \
  --storage-size 128 \
  --high-availability ZoneRedundant \
  --backup-retention 35

# Create App Service Plan (Premium)
az appservice plan create \
  --name asp-vrd-202520-prd-eus2 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --sku P1v2 \
  --is-linux \
  --number-of-workers 2

# Create Web App with staging slot
az webapp create \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --plan asp-vrd-202520-prd-eus2 \
  --runtime "NODE:20-lts" \
  --deployment-slot staging
```

**2. Configure Key Vault:**

```bash
# Create Key Vault
az keyvault create \
  --name kv-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --location eastus2

# Store secrets
az keyvault secret set \
  --vault-name kv-vrd-202520-prd-eus2-01 \
  --name "DATABASE-URL" \
  --value "postgresql://tournamentadmin:password@sqlsvr-vrd-202520-prd-eus2.postgres.database.azure.com:5432/tournament_platform?sslmode=require"

az keyvault secret set \
  --vault-name kv-vrd-202520-prd-eus2-01 \
  --name "AUTH-SECRET" \
  --value "<your-generated-secret>"

# Grant App Service access to Key Vault
az webapp identity assign \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app

# Get principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --query principalId -o tsv)

# Grant access policy
az keyvault set-policy \
  --name kv-vrd-202520-prd-eus2-01 \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

**3. Configure Environment Variables:**

Reference Key Vault secrets in App Service configuration:

```bash
@Microsoft.KeyVault(SecretUri=https://kv-vrd-202520-prd-eus2-01.vault.azure.net/secrets/DATABASE-URL)
@Microsoft.KeyVault(SecretUri=https://kv-vrd-202520-prd-eus2-01.vault.azure.net/secrets/AUTH-SECRET)
```

**4. Deploy to Staging Slot:**

```bash
# Build and deploy to staging slot first
az webapp deployment source config-zip \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --slot staging \
  --src deploy.zip
```

**5. Run Migrations:**

```bash
# SSH into staging slot
az webapp ssh \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --slot staging

# Run migrations
cd /home/site/wwwroot
npx prisma migrate deploy
```

**6. Smoke Test Staging Slot:**

```bash
curl https://app-vrd-202520-prd-eus2-01-staging.azurewebsites.net/api/health
```

**7. Swap to Production:**

```bash
az webapp deployment slot swap \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --slot staging \
  --target-slot production
```

**8. Configure Custom Domain and SSL:**

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --hostname tournament.yourdomain.com

# Enable HTTPS only
az webapp update \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --https-only true
```

---

## Post-Deployment Verification

### Automated Checks

```bash
# Health check
curl https://your-app.azurewebsites.net/api/health

# Expected: { "status": "ok", "database": "connected" }
```

### Manual Verification

- [ ] **Homepage loads:** Visit root URL, verify no errors
- [ ] **Sign in works:** Create test account, log in
- [ ] **Database connected:** Check logs for connection errors
- [ ] **Environment variables set:** Verify AUTH_SECRET not default
- [ ] **HTTPS enforced:** HTTP redirects to HTTPS
- [ ] **Monitoring active:** Check Application Insights data flowing

### Performance Checks

- [ ] **Page load time < 3s:** Use Lighthouse or WebPageTest
- [ ] **API response time < 500ms:** Test common endpoints
- [ ] **Database query time < 100ms:** Check slow query logs

### Security Checks

- [ ] **SSL/TLS valid:** Check SSL Labs report (A+ rating)
- [ ] **Security headers present:** Check securityheaders.com
- [ ] **No secrets in logs:** Review Application Insights logs
- [ ] **CORS configured:** Only allowed origins
- [ ] **Rate limiting:** Test API rate limits (if configured)

---

## Rollback Procedure

### Slot Swap Rollback

**If deployment has issues after swap:**

```bash
# Immediately swap back to previous version
az webapp deployment slot swap \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --slot staging \
  --target-slot production
```

### Database Rollback

**If migrations caused issues:**

```bash
# Restore from point-in-time backup
az postgres flexible-server restore \
  --resource-group rg-vrd-202520-prd-eus2-data \
  --name sqlsvr-vrd-202520-prd-eus2-restored \
  --source-server sqlsvr-vrd-202520-prd-eus2 \
  --restore-time "2025-11-15T10:00:00Z"

# Update connection string to point to restored server
# Restart app
```

---

## Troubleshooting

### App Won't Start

**Check Logs:**

```bash
az webapp log tail \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app
```

**Common Issues:**

- **"Cannot find module":** Build didn't complete, run `pnpm build`
- **"ECONNREFUSED":** Database connection string incorrect
- **"Invalid AUTH_SECRET":** Check environment variable set correctly
- **"Module parse failed":** Node version mismatch, verify runtime is Node 20

### Database Connection Fails

**Check Firewall:**

```bash
# Add App Service outbound IPs to PostgreSQL firewall
az postgres flexible-server firewall-rule create \
  --resource-group rg-vrd-202520-prd-eus2-data \
  --name sqlsvr-vrd-202520-prd-eus2 \
  --rule-name AllowAppService \
  --start-ip-address <app-service-outbound-ip> \
  --end-ip-address <app-service-outbound-ip>
```

**Test Connection:**

```bash
# From App Service SSH
psql "$DATABASE_URL"
```

### Slow Performance

**Enable Diagnostic Logging:**

```bash
az webapp log config \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --application-logging filesystem \
  --level information
```

**Check Application Insights:**

- Go to Azure Portal → Application Insights
- Review Performance blade
- Check Failures blade for errors
- Query custom metrics

### 502 Bad Gateway

**Common Causes:**

- App startup timeout (increase timeout setting)
- App crashing on startup (check logs)
- Resource exhaustion (scale up/out)

**Fix:**

```bash
# Increase startup timeout
az webapp config set \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --startup-time 600

# Restart app
az webapp restart \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app
```

---

## Monitoring and Alerts

### Application Insights Setup

```bash
# Create Application Insights
az monitor app-insights component create \
  --app appi-vrd-202520-prd-eus2 \
  --location eastus2 \
  --resource-group rg-vrd-202520-prd-eus2-app

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app appi-vrd-202520-prd-eus2 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --query instrumentationKey -o tsv)

# Add to app settings
az webapp config appsettings set \
  --name app-vrd-202520-prd-eus2-01 \
  --resource-group rg-vrd-202520-prd-eus2-app \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=$INSTRUMENTATION_KEY"
```

### Recommended Alerts

- **High Response Time:** > 2 seconds
- **Error Rate:** > 5% of requests
- **Database Connections:** > 80% of max
- **CPU Usage:** > 80% for 10 minutes
- **Memory Usage:** > 85% for 10 minutes

---

## Cost Management

### Monthly Cost Estimates (V1)

**Development:**

- App Service (B1): $13/month
- PostgreSQL (B1ms): $12/month
- **Total: ~$25/month**

**Staging:**

- App Service (S1): $70/month
- PostgreSQL (D2s_v3): $80/month
- **Total: ~$150/month**

**Production:**

- App Service (P1v2, 2 instances): $292/month
- PostgreSQL (D4s_v3, HA): $560/month
- Application Insights: $20/month
- **Total: ~$872/month**

### Cost Optimization Tips

- Use auto-scaling to scale down during off-hours
- Use Azure Reservations for 1-3 year commitments (save 30-70%)
- Archive old tournament data to reduce database size
- Use CDN for static assets
- Monitor and right-size resources based on usage

---

## Support and Escalation

**For deployment issues:**

1. Check this runbook
2. Review Application Insights logs
3. Check Azure Service Health
4. Contact ops@verdaio.com

**Emergency contacts:**

- Operations: ops@verdaio.com
- Azure Support: Submit ticket via portal

---

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Maintained By:** Tournament Platform Team
