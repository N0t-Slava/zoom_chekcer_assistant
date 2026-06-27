variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "eu-central-1"
}

variable "availability_zone" {
  description = "Availability zone for the public subnet."
  type        = string
  default     = "eu-central-1a"
}

variable "project_name" {
  description = "Name used for AWS resource tags."
  type        = string
  default     = "zoom-assistant-tracker"
}

variable "app_hostname" {
  description = "Public hostname used by Caddy for HTTPS."
  type        = string
  default     = "63.181.188.132.sslip.io"
}

variable "instance_type" {
  description = "EC2 instance size."
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "Ubuntu AMI ID for the selected AWS region."
  type        = string
  default     = "ami-0303e2e4a29f041a3"
}

variable "ssh_key_name" {
  description = "Optional existing EC2 key pair name for SSH access."
  type        = string
  default     = null
}

variable "allowed_ssh_cidr" {
  description = "Optional CIDR allowed to SSH into the instance, for example your.public.ip/32."
  type        = string
  default     = null
}

variable "repository_url" {
  description = "Git repository URL to clone on the EC2 instance."
  type        = string
}

variable "app_environment" {
  description = "Application environment for the deployed app."
  type        = string
  default     = "development"
}

variable "ssm_parameter_path" {
  description = "SSM Parameter Store path containing app environment variables."
  type        = string
  default     = "/zoom-assistant-tracker/prod"
}
