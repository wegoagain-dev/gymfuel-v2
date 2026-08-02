# this is for my actual ecs before it starts the task definition, its allowing to pull images
# write logs, and read secrets manager
resource "aws_iam_role" "ecs_execution_role" {
  name = var.execution_role_name
  # Trust Policy: Allowing ECS Service to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

# Now attaching the "AWS Managed Policy" that gives permissions to do things like (Pull images, Write logs)
resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.id
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Policy to allow ECS to read Secrets Manager
resource "aws_iam_role_policy" "ecs_secrets_policy" {
  name = "ecs-secrets-access"
  role = aws_iam_role.ecs_execution_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = compact([
        aws_secretsmanager_secret.ecs_db_string.arn,
        var.openai_api_key_secret_arn
      ])
    }]
  })
}


# ECS Task Role (For my actual code to be able to do things with aws)
resource "aws_iam_role" "ecs_task_role" {
  name = var.task_role_name
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

# havent added the task policies yet only when needed
