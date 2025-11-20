// Bicep template for deploying Maester Web UI to Azure Container Apps
// Usage: az deployment group create --resource-group <rg> --template-file azure-deploy.bicep

@description('Name of the container app')
param containerAppName string = 'maester-web-ui'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the container apps environment')
param environmentName string = 'maester-env'

@description('Name of the storage account')
param storageAccountName string = 'maesterstore${uniqueString(resourceGroup().id)}'

@description('Name of the storage container')
param storageContainerName string = 'maester-reports'

@description('Container image to deploy')
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Container registry server')
param registryServer string = ''

@description('Container registry username (leave empty for managed identity)')
param registryUsername string = ''

@description('Container registry password (leave empty for managed identity)')
@secure()
param registryPassword string = ''

@description('Minimum number of replicas')
@minValue(0)
@maxValue(30)
param minReplicas int = 1

@description('Maximum number of replicas')
@minValue(0)
@maxValue(30)
param maxReplicas int = 3

@description('CPU cores allocated to each replica')
param cpu string = '1.0'

@description('Memory allocated to each replica')
param memory string = '2Gi'

@description('Allowed CORS origins (comma-separated)')
param allowedOrigins string = ''

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }

  resource blobService 'blobServices' = {
    name: 'default'
    
    resource container 'containers' = {
      name: storageContainerName
      properties: {
        publicAccess: 'None'
      }
    }
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${containerAppName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Container Apps Environment
resource environment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3001
        transport: 'http'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: !empty(registryServer) ? [
        {
          server: registryServer
          username: !empty(registryUsername) ? registryUsername : null
          passwordSecretRef: !empty(registryPassword) ? 'registry-password' : null
          identity: empty(registryPassword) ? 'system' : null
        }
      ] : []
      secrets: !empty(registryPassword) ? [
        {
          name: 'registry-password'
          value: registryPassword
        }
      ] : []
    }
    template: {
      containers: [
        {
          name: 'maester-web-ui'
          image: containerImage
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'USE_AZURITE'
              value: 'false'
            }
            {
              name: 'STORAGE_ACCOUNT_NAME'
              value: storageAccount.name
            }
            {
              name: 'STORAGE_CONTAINER_NAME'
              value: storageContainerName
            }
            {
              name: 'PORT'
              value: '3001'
            }
            {
              name: 'ALLOWED_ORIGINS'
              value: !empty(allowedOrigins) ? allowedOrigins : 'https://${containerAppName}.${environment.properties.defaultDomain}'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3001
              }
              initialDelaySeconds: 60
              periodSeconds: 30
              timeoutSeconds: 10
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3001
              }
              initialDelaySeconds: 30
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

// Role Assignment - Storage Blob Data Contributor
resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, containerApp.id, 'StorageBlobDataContributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe') // Storage Blob Data Contributor
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output storageAccountName string = storageAccount.name
output containerAppName string = containerApp.name
output environmentName string = environment.name
output principalId string = containerApp.identity.principalId
