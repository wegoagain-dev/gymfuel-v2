# infrastructure
# the Cluster
resource "aws_ecs_cluster" "main" {
  name = var.cluster_name

  setting { # to get moer than just cpu/memory metrics
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Terraform   = "true"
    Environment = var.environment
    Project     = var.project_name
  }
}

# logging (CloudWatch)
resource "aws_cloudwatch_log_group" "backend" {
  name              = var.logging_backend
  retention_in_days = 7
}
resource "aws_cloudwatch_log_group" "frontend" {
  name              = var.logging_frontend
  retention_in_days = 7
}

# security group
resource "aws_security_group" "ecs_tasks" {
  name        = var.ecs_security_group_name
  description = "Allow traffic from ALB only"
  vpc_id      = module.vpc.vpc_id
  # allow traffic ONLY from the ALB Security Group
  ingress {
    protocol        = "tcp"
    from_port       = 3000
    to_port         = 3000
    security_groups = [aws_security_group.alb_sg.id]
    description     = "Allow ALB to reach Frontend"
  }
  ingress {
    protocol        = "tcp"
    from_port       = 8000
    to_port         = 8000
    security_groups = [aws_security_group.alb_sg.id]
    description     = "Allow ALB to reach Backend"
  }
  # Outbound Rule: Allow everything
  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Terraform   = "true"
    Environment = var.environment
    Project     = var.project_name
  }
}

# task definition for backend (setting up my image)
resource "aws_ecs_task_definition" "backend" {
  family                   = var.task_definition_backend
  network_mode             = "awsvpc" # each task to get own ENI and IP address
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory

  # roles
  execution_role_arn = aws_iam_role.ecs_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([ # info and image about the backend container
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:latest"
      essential = true
      portMappings = [ # host 8000 to container 8000
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]
      # logs
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      environment = [
        #  CORS origin so the frontend can talk to backend my domain only
        { name = "ALLOWED_ORIGINS", value = "https://${var.domain_name},https://www.${var.domain_name}" },
        { name = "SECRET_KEY", value = random_password.backend_secret_key.result },
        { name = "OPENAI_MEAL_ANALYSIS_MODEL", value = var.openai_meal_analysis_model },
        { name = "OPENAI_RECIPE_MODEL", value = var.openai_recipe_model }
      ]
      # Secrets (Injected securely from Secrets Manager)
      secrets = concat([
        { # Local (Docker Compose)
          # postgresql://postgres:postgres@postgres:5432/gymfuel
          # AWS (Terraform)
          # postgresql://${var.db_username}:${random_password.password.result}@${aws_db_instance.db.address}:5432/${var.db_name}
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.ecs_db_string.arn
        }
        ], var.openai_api_key_secret_arn != "" ? [
        {
          name      = "OPENAI_API_KEY"
          valueFrom = var.openai_api_key_secret_arn
        }
      ] : [])
    }
  ])
}

# task definition for frontend
resource "aws_ecs_task_definition" "frontend" {
  family                   = var.task_definition_frontend
  network_mode             = "awsvpc" # each task to get own ENI and IP address
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory

  # roles
  execution_role_arn = aws_iam_role.ecs_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([ # info and image about the frontend container
    {
      name      = "frontend"
      image     = "${aws_ecr_repository.frontend.repository_url}:latest"
      essential = true
      portMappings = [ # host 3000 to container 3000
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      # logs
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      environment = [
        #  backend url reachable from alb
        { name = "NEXT_PUBLIC_API_URL", value = "https://${var.domain_name}" }
      ]
    }
  ])
}

# service (its needed for keeping app running, connected to alb )

resource "aws_ecs_service" "backend" {
  name            = var.service_backend
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  depends_on = [aws_lb_listener_rule.api_https]
}

# service is a way to set up how my actual ecs keeps running
resource "aws_ecs_service" "frontend" {
  name            = var.service_frontend
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  deployment_circuit_breaker { # if issue with ecr image reroll to previous version
    enable   = true
    rollback = true
  }
  depends_on = [aws_lb_listener.https]
}
