# Infrastructure Documentation

**Project:** Tournament Platform (saas202520)
**Organization:** vrd (Verdaio)
**Project Code:** 202520
**Primary Region:** East US 2 (eus2)

---

## Overview

This directory contains Infrastructure as Code (IaC) templates for deploying the Tournament Platform to Microsoft Azure.

**V1 Status:** Infrastructure templates are configured but simplified for initial release. Full resource deployment is planned for V2.

### What's Included

- **Bicep Templates**: Azure-native IaC (recommended for Azure deployments)
- **Terraform Templates**: Multi-cloud compatible IaC
- **Azure Security Baseline**: Comprehensive security infrastructure (optional, for production)

---

## Quick Start

### Option 1: Bicep (Recommended for Azure)

**Prerequisites:**

- Azure CLI (`az`) installed and authenticated
- Bicep CLI (included with Azure CLI 2.20.0+)
- Azure subscription with Contributor access

**Deploy Resource Groups:**

```bash
cd infrastructure/bicep

# Deploy to dev environment
az deployment sub create \
  --location eastus2 \
  --template-file main.bicep \
  --parameters env=dev location=eastus2 slice=app

# Deploy to staging
az deployment sub create \
  --location eastus2 \
  --template-file main.bicep \
  --parameters env=stg location=eastus2 slice=app

# Deploy to production
az deployment sub create \
  --location eastus2 \
  --template-file main.bicep \
  --parameters env=prd location=eastus2 slice=app
```

**What Gets Deployed:**

- ✅ Resource Groups (app, data, net)
- ⏸️ Other resources (Log Analytics, Key Vault, VNet, etc.) - See V2 Roadmap below

**Expected Outputs:**

```
resourceGroupAppName: rg-vrd-202520-dev-eus2-app
resourceGroupDataName: rg-vrd-202520-dev-eus2-data
resourceGroupNetName: rg-vrd-202520-dev-eus2-net
namePrefix: vrd-202520-dev-eus2
```

### Option 2: Terraform

**Prerequisites:**

- Terraform 1.5+ installed
- Azure CLI authenticated (`az login`)
- Azure subscription with Contributor access

**Initialize and Deploy:**

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment (dev)
terraform plan \
  -var="env=dev" \
  -var="location=eastus2" \
  -out=tfplan

# Apply deployment
terraform apply tfplan
```

**Create Environment-Specific Variable Files:**

```bash
# dev.tfvars
env      = "dev"
location = "eastus2"

# stg.tfvars
env      = "stg"
location = "eastus2"

# prd.tfvars
env      = "prd"
location = "eastus2"
```

Then deploy with:

```bash
terraform plan -var-file="dev.tfvars"
terraform apply -var-file="dev.tfvars"
```

---

## Resource Naming Convention

All resources follow the **Verdaio Azure Naming Standard v1.2**:

**Pattern:** `{type}-{org}-{project}-{env}-{region}-{slice}-{seq}`

**Examples:**

```
Resource Groups:
  rg-vrd-202520-prd-eus2-app
  rg-vrd-202520-prd-eus2-data
  rg-vrd-202520-prd-eus2-net

App Service:
  app-vrd-202520-prd-eus2-01

Key Vault:
  kv-vrd-202520-prd-eus2-01

Storage Account:
  stvrd202520prdeus201

Virtual Network:
  vnet-vrd-202520-prd-eus2

Log Analytics:
  la-vrd-202520-prd-eus2

Application Insights:
  appi-vrd-202520-prd-eus2
```

**Variables:**

- `org`: vrd (Verdaio)
- `project`: 202520 (Tournament Platform project code)
- `env`: dev | stg | prd | tst | sbx
- `region`: eus2 (East US 2) | wus2 (West US 2)
- `slice`: app | data | net | sec | ops

---

## Resource Tags

All resources are automatically tagged with:

**Required Tags:**

- `Org`: vrd
- `Project`: 202520
- `Environment`: dev|stg|prd
- `Region`: eus2
- `Owner`: ops@verdaio.com
- `CostCenter`: 202520-llc
- `CreatedDate`: YYYY-MM-DD (auto-generated)
- `ManagedBy`: bicep|terraform

**Recommended Tags (optional):**

- `DataSensitivity`: internal
- `Compliance`: none
- `Application`: saas202520

---

## V1 vs V2 Infrastructure

### V1 (Current - Minimal for Launch)

**Scope:** Create resource groups, deploy app manually or via CI/CD

**What's Included:**

- Resource group creation via IaC templates
- Naming convention enforcement
- Tag standardization
- Documentation

**Deployment Method:**

1. Run Bicep/Terraform to create resource groups
2. Deploy Tournament Platform web app to Azure App Service via:
   - Azure Portal
   - Azure CLI (`az webapp up`)
   - GitHub Actions deployment workflow (recommended)

**Why V1 is Simplified:**

- Faster time to market
- Focus on application deployment
- Reduce infrastructure complexity for initial release
- Manual/CLI deployment is acceptable for V1

### V2 (Planned - Full Infrastructure Automation)

**Scope:** Complete infrastructure automation

**Planned Resources:**

- ✅ Resource Groups (already in V1)
- Log Analytics Workspace
- Application Insights
- Key Vault (for secrets management)
- Virtual Network (with subnets)
- Network Security Groups
- App Service Plan
- App Service (Web App)
- Azure Database for PostgreSQL Flexible Server
- Redis Cache (optional, for session/caching)
- Azure Front Door or Application Gateway (optional, for multi-region)

**Implementation Options:**

1. **Bicep Modules (Recommended)**
   - Create modules in `infrastructure/bicep/modules/`
   - Reference from `main.bicep`
   - See TODO comments in `main.bicep`

2. **Terraform Modules**
   - Already structured in `infrastructure/terraform/modules/`
   - Extend `main.tf` to use modules

3. **Azure Portal/CLI**
   - Create resources manually
   - Export to ARM templates
   - Convert to Bicep/Terraform

**When to Enable V2:**

- After V1 launch and initial feedback
- When infrastructure automation becomes bottleneck
- When deploying to multiple environments regularly
- When adding DR/multi-region support

---

## GitHub Workflows

### Essential Workflows (Used in V1)

**`.github/workflows/ci.yml`** - Main CI pipeline

- Runs on every push/PR
- Lint, build, unit tests
- **Status:** ✅ Working (sync-service build skipped with message)

**`.github/workflows/e2e-tests.yml`** - Playwright E2E tests

- Runs on push/PR
- Spins up PostgreSQL service
- Runs end-to-end browser tests
- **Status:** ✅ Configured

**`.github/workflows/lighthouse-ci.yml`** - Performance monitoring

- Runs on push/PR
- Requires: `LHCI_GITHUB_APP_TOKEN` secret (optional)
- **Status:** ⏸️ Optional for V1

### AI Development System Workflows (Not Essential for V1)

These workflows are part of an automated AI development orchestration system:

**`.github/workflows/coordinator.yml`** - AI agent coordinator

- Polls GitHub Projects board
- Orchestrates worker agents
- **Status:** 🤖 Part of AI system (manual trigger only)

**`.github/workflows/backend-worker.yml`** - Backend lane worker

- Runs when `lane:backend` label applied to PR
- **Note:** References sync-service build (disabled for V1)
- **Status:** 🤖 Part of AI system (label-triggered only)

**`.github/workflows/frontend-worker.yml`** - Frontend lane worker

- Runs when `lane:frontend` label applied to PR
- References Vercel deployment
- **Status:** 🤖 Part of AI system (label-triggered only)

**`.github/workflows/contract-worker.yml`** - API contracts lane worker

- Runs when `lane:contracts` label applied to PR
- **Status:** 🤖 Part of AI system (label-triggered only)

**`.github/workflows/test-worker.yml`** - Test lane worker

- Runs when `lane:tests` label applied to PR
- **Status:** 🤖 Part of AI system (label-triggered only)

**`.github/workflows/reviewer-merger.yml`** - AI code reviewer

- Reviews PRs and auto-merges if criteria met
- **Status:** 🤖 Part of AI system (automated)

**For V1:** These AI workflows are optional and won't interfere with manual development. They require specific labels or manual triggers. See `config.json` for AI system configuration.

---

## Azure Security Baseline (Optional)

For production deployments, consider deploying the comprehensive security baseline:

**Location:** `infrastructure/azure-security-bicep/`

**What It Includes:**

- Hub-spoke network architecture
- Azure Firewall Premium
- DDoS Protection
- Azure Bastion (secure VM access)
- Log Analytics + Azure Sentinel
- Microsoft Defender for Cloud (all plans)
- Azure Policies for governance
- Private DNS zones

**Cost:** ~$5,000-6,000/month (production) | ~$1,000-1,500/month (dev/test)

**When to Deploy:**

- Production environments with compliance requirements
- Multi-tenant deployments
- Environments requiring advanced threat protection
- Regulated industries (HIPAA, PCI-DSS, etc.)

**How to Deploy:**

```bash
cd infrastructure/azure-security-bicep

az deployment sub create \
  --location eastus2 \
  --template-file main.bicep \
  --parameters \
    org=vrd \
    proj=202520 \
    env=prd \
    primaryRegion=eus2 \
    enableDDoS=true \
    firewallSku=Premium
```

See `infrastructure/azure-security-bicep/README.md` for detailed documentation.

---

## Deployment Checklist

### Pre-Deployment

- [ ] Azure CLI installed and authenticated (`az login`)
- [ ] Subscription selected (`az account set --subscription <id>`)
- [ ] Permissions verified (Contributor or Owner role)
- [ ] Resource naming reviewed (see naming convention above)
- [ ] Environment variables prepared (dev/stg/prd)
- [ ] Tags reviewed and customized if needed

### Deployment

- [ ] Run Bicep/Terraform to create resource groups
- [ ] Verify resource groups created in Azure Portal
- [ ] Note output values (resource group names, etc.)
- [ ] Deploy web app to App Service (manual or CI/CD)
- [ ] Configure environment variables in App Service
- [ ] Set up database connection string in Key Vault or App Service config
- [ ] Verify app starts and connects to database

### Post-Deployment

- [ ] Verify all tags applied correctly
- [ ] Configure monitoring and alerts in Azure Monitor
- [ ] Set up cost alerts in Azure Cost Management
- [ ] Document deployment in project wiki/docs
- [ ] Test application endpoints
- [ ] Configure custom domain and SSL (if applicable)
- [ ] Set up CI/CD pipeline for future deployments

---

## Troubleshooting

### Bicep Deployment Fails

**Error:** "Resource group already exists"

- **Solution:** Use `az deployment sub what-if` to preview changes first
- Or delete existing RG: `az group delete --name <rg-name>`

**Error:** "Location 'eastus2' not supported"

- **Solution:** Check region support: `az account list-locations -o table`
- Use alternate region: `location=eastus` or `location=westus2`

**Error:** "Insufficient permissions"

- **Solution:** Verify role assignment: `az role assignment list --assignee <your-email>`
- Required: Contributor or Owner at subscription level

### Terraform Deployment Fails

**Error:** "Backend initialization required"

- **Solution:** Uncomment backend configuration in `main.tf`
- Create storage account for state: See Terraform docs

**Error:** "Provider 'azurerm' not found"

- **Solution:** Run `terraform init` to download providers

**Error:** "Resource already exists"

- **Solution:** Import existing resource: `terraform import azurerm_resource_group.app /subscriptions/.../resourceGroups/...`

---

## Cost Estimation

### V1 (Minimal Infrastructure)

**Resource Groups:** Free
**Total V1 Cost:** $0 (until resources deployed)

### V2 (Full Infrastructure - Estimated)

**Development Environment:**

- App Service Plan (B1): ~$13/month
- PostgreSQL Flexible Server (Burstable B1ms): ~$12/month
- Application Insights (5GB included): ~$0-10/month
- **Total Dev:** ~$25-35/month

**Staging Environment:**

- App Service Plan (S1): ~$70/month
- PostgreSQL Flexible Server (General Purpose D2s_v3): ~$80/month
- Redis Cache (Basic C0): ~$17/month
- Application Insights: ~$10/month
- **Total Staging:** ~$177/month

**Production Environment:**

- App Service Plan (P1v2): ~$146/month
- PostgreSQL Flexible Server (General Purpose D4s_v3): ~$280/month
- Redis Cache (Standard C1): ~$55/month
- Application Insights: ~$20/month
- Azure Front Door (Standard): ~$35/month
- **Total Production:** ~$536/month

**Note:** Prices are estimates for East US 2 region as of 2024. Actual costs vary based on usage, data transfer, and storage.

---

## Next Steps

1. **For V1 Launch:**
   - Deploy resource groups using Bicep or Terraform
   - Deploy web app manually or via GitHub Actions
   - Configure environment variables and secrets
   - Test end-to-end

2. **For V2 Enhancement:**
   - Create Bicep/Terraform modules for remaining resources
   - Automate full infrastructure deployment
   - Set up multi-environment CI/CD pipeline
   - Consider Azure Security Baseline for production

3. **For Production:**
   - Review and deploy Security Baseline
   - Configure custom domains and SSL
   - Set up monitoring and alerting
   - Configure backups and disaster recovery
   - Perform security audit

---

## Support & Documentation

- **Main README:** `../README.md` - Project overview and quick start
- **Local Development:** `../docs/LOCAL_DEV.md` - Development setup
- **TD Workflow:** `../docs/TD_WORKFLOW.md` - Tournament Director features
- **Project Log:** `../docs/PROJECT_LOG.md` - Development history
- **Azure Naming Standard:** `../technical/azure-naming-standard.md` - Full naming spec

**For Infrastructure Questions:**

- Contact: ops@verdaio.com
- Project Code: 202520
- Organization: vrd (Verdaio)

---

**Last Updated:** 2025-11-15
**Template Version:** V1 (Simplified)
**Next Milestone:** V2 (Full automation)
