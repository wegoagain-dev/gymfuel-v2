# region and environment
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-2"
}

variable "environment" {
  description = "Environment (dev, prod, staging)"
  type        = string
  default     = "dev"
}

# vpc variables
variable "project_name" {
  description = "Project name to be used for tagging resources"
  type        = string
  default     = "ecs-gymfuel"
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability zones for the VPC"
  type        = list(string)
  default     = ["eu-west-2a", "eu-west-2b"]
}

variable "public_subnets" {
  description = "Public subnets for the VPC"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "private_subnets" {
  description = "Private subnets for the VPC"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "database_subnets" {
  description = "Database subnets for the VPC"
  type        = list(string)
  default     = ["10.0.100.0/24", "10.0.200.0/24"]
}

# database

variable "aws_db_subnet_name" {
  description = "Name of the AWS DB subnet group"
  type        = string
  default     = "gymfuel-db-subnet"
}

variable "aws_db_sg_name" {
  description = "Name of the AWS DB security group"
  type        = string
  default     = "gymfuel-db-security-group"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "gymfuel_db"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "gymfuel"
}

variable "secret_manager_name_db" {
  description = "Name of the AWS Secrets Manager for the database"
  type        = string
  default     = "gymfuel-db-string"
}

# ecr
variable "ecr_backend_name" {
  description = "Name of the AWS ECR repository for the backend"
  type        = string
  default     = "gymfuel-backend"
}

variable "ecr_frontend_name" {
  description = "Name of the AWS ECR repository for the frontend"
  type        = string
  default     = "gymfuel-frontend"
}

# alb
variable "aws_alb_sg_name" {
  description = "Name of the AWS ALB security group"
  type        = string
  default     = "gymfuel-alb-security-group"
}

variable "aws_alb_name" {
  description = "Name of the AWS ALB"
  type        = string
  default     = "gymfuel-alb"
}

variable "target_group_backend" {
  description = "Name of the AWS ALB target group"
  type        = string
  default     = "gymfuel-alb-backend"
}

variable "target_group_frontend" {
  description = "Name of the AWS ALB target group"
  type        = string
  default     = "gymfuel-alb-frontend"
}

# iam

variable "execution_role_name" {
  description = "Name of the AWS IAM role for ECS execution"
  type        = string
  default     = "gymfuel-ecs-execution-role"
}

variable "task_role_name" {
  description = "Name of the AWS IAM role for ECS task"
  type        = string
  default     = "gymfuel-ecs-task-role"
}

# ecs

variable "cluster_name" {
  description = "Name of the AWS ECS cluster"
  type        = string
  default     = "gymfuel-ecs-cluster"
}

variable "logging_backend" {
  description = "Name of the AWS CloudWatch log for backend"
  type        = string
  default     = "/ecs/gymfuel-backend"
}

variable "logging_frontend" {
  description = "Name of the AWS CloudWatch log for frontend"
  type        = string
  default     = "/ecs/gymfuel-frontend"
}

variable "ecs_security_group_name" {
  description = "Name of the AWS ECS security group"
  type        = string
  default     = "gymfuel-ecs-security-group"
}

variable "task_definition_backend" {
  description = "Name of the AWS ECS task definition for backend"
  type        = string
  default     = "gymfuel-task-definition-backend"
}

variable "task_definition_frontend" {
  description = "Name of the AWS ECS task definition for frontend"
  type        = string
  default     = "gymfuel-task-definition-frontend"
}

variable "service_backend" {
  description = "Name of the AWS ECS service for backend"
  type        = string
  default     = "gymfuel-service-backend"
}

variable "service_frontend" {
  description = "Name of the AWS ECS service for frontend"
  type        = string
  default     = "gymfuel-service-frontend"
}

# domain route53/acm
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "gymfuel.xyz"
}

# scaling and sizing
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "ecs_cpu" {
  description = "CPU units for ECS tasks"
  type        = string
  default     = "256"
}

variable "ecs_memory" {
  description = "Memory for ECS tasks"
  type        = string
  default     = "512"
}

variable "openai_api_key_secret_arn" {
  description = "Optional ARN of an existing Secrets Manager secret containing the OpenAI API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "openai_meal_analysis_model" {
  description = "OpenAI model used for transient GymFuel Lens meal-photo analysis"
  type        = string
  default     = "gpt-5.6-terra"
}

variable "openai_recipe_model" {
  description = "OpenAI model used for GymFuel Lens pantry recipe generation"
  type        = string
  default     = "gpt-5.6-luna"
}
