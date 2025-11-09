# Terraform Variables
# Azure SaaS Project: {{PROJECT_NAME}}

variable "org" {
  description = "Organization code (2-4 chars)"
  type        = string
  default     = "{{AZURE_ORG}}"
}

variable "project" {
  description = "Project code (2-5 chars)"
  type        = string
  default     = "{{AZURE_PROJECT}}"
}

variable "env" {
  description = "Environment (prd, stg, dev, tst, sbx)"
  type        = string
}

variable "region" {
  description = "Azure region short code"
  type        = string
  default     = "{{AZURE_PRIMARY_REGION}}"
}

variable "location" {
  description = "Azure region full name"
  type        = string
}

variable "owner" {
  description = "Owner email"
  type        = string
  default     = "ops@verdaio.com"
}

variable "cost_center" {
  description = "Cost center"
  type        = string
  default     = "{{AZURE_PROJECT}}-llc"
}

variable "data_sensitivity" {
  description = "Data sensitivity level"
  type        = string
  default     = "internal"
}

variable "compliance" {
  description = "Compliance requirements"
  type        = string
  default     = "none"
}

variable "business_unit" {
  description = "Business unit (optional)"
  type        = string
  default     = null
}

variable "application" {
  description = "Application name (optional)"
  type        = string
  default     = "{{PROJECT_NAME}}"
}
