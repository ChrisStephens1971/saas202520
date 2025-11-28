// Main Bicep Configuration
// Azure SaaS Project: saas202520 (Tournament Platform)

targetScope = 'subscription'

@description('Environment')
@allowed([
  'prd'
  'stg'
  'dev'
  'tst'
  'sbx'
])
param env string

@description('Azure location')
param location string

@description('Logical slice')
@allowed([
  'app'
  'data'
  'net'
])
param slice string

// Import naming module
module naming 'modules/naming.bicep' = {
  name: 'naming'
  params: {
    env: env
    region: regionShortCode
    location: location
    slice: slice
    owner: 'ops@verdaio.com'
    costCenter: '202520-llc'
  }
}

// Region mapping
var regionShortCode = location == 'eastus2' ? 'eus2' : location == 'westus2' ? 'wus2' : 'eus2'

// Resource Groups
resource rgApp 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: '${naming.outputs.resourceGroupName}-app'
  location: location
  tags: naming.outputs.commonTags
}

resource rgData 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: '${naming.outputs.resourceGroupName}-data'
  location: location
  tags: naming.outputs.commonTags
}

resource rgNet 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: '${naming.outputs.resourceGroupName}-net'
  location: location
  tags: naming.outputs.commonTags
}

// TODO (V2): Add resource deployments using modules
// Subscription-scoped deployments can only create resource groups directly.
// Other resources need to be deployed via modules with scope property or separate RG-scoped deployments.
//
// Planned resources for V2:
// - Log Analytics Workspace (in rgApp)
// - Application Insights (in rgApp)
// - Key Vault (in rgApp)
// - Virtual Network (in rgNet)
// - App Service Plan & App Service (in rgApp)
// - Azure Database for PostgreSQL (in rgData)
//
// To deploy these, either:
// 1. Create separate Bicep modules in infrastructure/bicep/modules/ for each resource type
// 2. Use resource group-scoped deployments after creating the RGs above
// 3. Use Azure Portal or Azure CLI to create resources in the RGs
//
// V1 Focus: Tournament platform web app deployment
// - Resource groups created via this template
// - App resources deployed via Azure Portal/CLI or GitHub Actions

// Outputs
output resourceGroupAppName string = rgApp.name
output resourceGroupDataName string = rgData.name
output resourceGroupNetName string = rgNet.name
output namePrefix string = naming.outputs.namePrefix
output logAnalyticsName string = naming.outputs.logAnalyticsName
output appInsightsName string = naming.outputs.appInsightsName
output keyVaultName string = '${naming.outputs.keyVaultName}-01'
output vnetName string = naming.outputs.vnetName
