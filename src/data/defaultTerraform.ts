import { Node, Edge } from 'reactflow';
import { CloudResourceData, PresetArchitecture } from '@/types/cloud-architecture';

export const BASIC_TERRAFORM_CODE = `# ==============================================================================
# ZERO_RADIUS INFRASTRUCTURE DEFINITION
# TARGET: PRODUCTION VPC [us-east-1]
# CORE CLUSTER: WEB APP -> POSTGRESQL DATABASE
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30.0"
    }
  }
}

# --- VPC & NETWORKING ---
resource "aws_vpc" "production_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "zeroradius-vpc"
    Environment = "production"
    Tier        = "network-core"
  }
}

# --- APPLICATION LOAD BALANCER ---
resource "aws_lb" "main_ingress" {
  name               = "zeroradius-alb-ingress"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.ingress_sg.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  enable_deletion_protection = true

  tags = {
    Cluster = "zero-alb"
    TLS     = "1.3"
  }
}

# --- WEB APPLICATION SERVICE ---
resource "aws_ecs_service" "web_app" {
  name            = "zeroradius-web-service"
  cluster         = aws_ecs_cluster.production.id
  task_definition = aws_ecs_task_definition.web_app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_app.id]
    security_groups  = [aws_security_group.web_app_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app_tg.arn
    container_name   = "nextjs-frontend"
    container_port   = 3000
  }

  depends_on = [aws_db_instance.postgres_primary]

  tags = {
    Component = "Frontend-Core"
    Runtime   = "Node20-Next15"
  }
}

# --- PRIMARY POSTGRESQL DATABASE ---
resource "aws_db_instance" "postgres_primary" {
  identifier             = "zeroradius-postgres-prod"
  allocated_storage      = 100
  max_allocated_storage  = 500
  storage_type           = "gp3"
  engine                 = "postgres"
  engine_version         = "16.2"
  instance_class         = "db.r6g.xlarge"
  multi_az               = true
  db_name                = "zeroradius_db"
  username               = "zr_sysadmin"
  port                   = 5432
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = true
  deletion_protection    = true

  backup_retention_period   = 30
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:30-Mon:05:30"
  auto_minor_version_upgrade = true

  tags = {
    Engine   = "PostgreSQL"
    Topology = "Multi-AZ-HA"
    Security = "AES-256-Encrypted"
  }
}

# --- IN-MEMORY REDIS CACHE ---
resource "aws_elasticache_cluster" "redis_cache" {
  cluster_id           = "zeroradius-redis-node"
  engine               = "redis"
  node_type            = "cache.r6g.large"
  num_cache_nodes      = 2
  parameter_group_name = "default.redis7"
  port                 = 6379
  security_group_ids   = [aws_security_group.redis_sg.id]

  tags = {
    Role = "Session-Cache"
  }
}

# --- CLOUD OBJECT STORAGE ---
resource "aws_s3_bucket" "asset_storage" {
  bucket        = "zeroradius-assets-prod-vault"
  force_destroy = false

  tags = {
    Classification = "Encrypted-Assets"
  }
}
`;

export const PRESET_ARCHITECTURES: PresetArchitecture[] = [
  {
    id: 'basic-cloud',
    name: 'Web App + PostgreSQL (Default)',
    description: 'Next.js App service connected to an RDS PostgreSQL DB with ALB ingress & Redis caching',
    fileName: 'architecture_main.tf',
    code: BASIC_TERRAFORM_CODE,
  },
  {
    id: 'minimal-webapp-db',
    name: 'Minimal: App -> Postgres',
    description: 'Clean direct architecture of Web Application instance to Postgres DB',
    fileName: 'webapp_postgres.tf',
    code: `# ==============================================================================
# MINIMAL CLUSTER: WEB APP -> POSTGRESQL DATABASE
# ==============================================================================

resource "aws_ecs_service" "web_app" {
  name            = "web-application-core"
  task_definition = "app-task:v1"
  desired_count   = 2

  load_balancer {
    container_port = 3000
    container_name = "web-container"
  }
}

resource "aws_db_instance" "postgres_primary" {
  identifier     = "postgres-production"
  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.t4g.large"
  port           = 5432
  allocated_storage = 50
}
`,
  },
  {
    id: 'enterprise-mesh',
    name: 'Enterprise Multi-Tier Architecture',
    description: 'VPC Gateway, ALB, ECS Cluster, Multi-AZ Postgres, ElastiCache & S3 Storage',
    fileName: 'enterprise_stack.tf',
    code: BASIC_TERRAFORM_CODE,
  }
];

// Initial Dummy Nodes for the basic cloud architecture (Web App connected to PostgreSQL Database)
export const INITIAL_NODES: Node<CloudResourceData>[] = [
  {
    id: 'node-gateway',
    type: 'gateway',
    position: { x: 50, y: 180 },
    data: {
      label: 'Edge Gateway',
      sublabel: 'aws_internet_gateway.public',
      resourceType: 'Internet Gateway',
      terraformResource: 'aws_internet_gateway',
      provider: 'hashicorp/aws',
      status: 'ONLINE',
      metrics: {
        latency: '8ms',
        connections: '14.2k req/s',
      },
      details: {
        cidrBlock: '0.0.0.0/0',
        port: 443,
        securityGroup: 'sg-edge-perimeter',
      },
      terraformSnippet: `resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "zeroradius-edge-gw"
  }
}`,
      accentColor: 'cyan',
    },
  },
  {
    id: 'node-alb',
    type: 'loadBalancer',
    position: { x: 340, y: 180 },
    data: {
      label: 'ALB Ingress',
      sublabel: 'aws_lb.main_ingress',
      resourceType: 'Application Load Balancer',
      terraformResource: 'aws_lb',
      provider: 'hashicorp/aws',
      status: 'HEALTHY',
      metrics: {
        latency: '1.4ms',
        connections: '8,420 conn',
      },
      details: {
        port: 443,
        tier: 'Public Subnet',
        securityGroup: 'sg-alb-ingress',
      },
      terraformSnippet: `resource "aws_lb" "main_ingress" {
  name               = "zeroradius-alb-ingress"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.ingress_sg.id]
}`,
      accentColor: 'violet',
    },
  },
  {
    id: 'node-webapp',
    type: 'webApp',
    position: { x: 650, y: 180 },
    data: {
      label: 'Web App Core',
      sublabel: 'aws_ecs_service.web_app',
      resourceType: 'ECS Container Service',
      terraformResource: 'aws_ecs_service',
      provider: 'hashicorp/aws',
      status: 'HEALTHY',
      metrics: {
        cpu: '18%',
        memory: '512MB / 2GB',
        replicas: '3 / 3 Active',
      },
      details: {
        port: 3000,
        tier: 'Private App Subnet',
        engine: 'Node.js 20 / Next.js',
        securityGroup: 'sg-fargate-app',
      },
      terraformSnippet: `resource "aws_ecs_service" "web_app" {
  name            = "zeroradius-web-service"
  cluster         = aws_ecs_cluster.production.id
  desired_count   = 3
  launch_type     = "FARGATE"
  load_balancer {
    container_port = 3000
  }
}`,
      accentColor: 'emerald',
    },
  },
  {
    id: 'node-postgres',
    type: 'database',
    position: { x: 990, y: 80 },
    data: {
      label: 'PostgreSQL RDS',
      sublabel: 'aws_db_instance.postgres_primary',
      resourceType: 'Relational Database Service',
      terraformResource: 'aws_db_instance',
      provider: 'hashicorp/aws',
      status: 'SYNCED',
      metrics: {
        connections: '64 / 200',
        storage: '34.2 GB / 100 GB',
        latency: '0.8ms',
      },
      details: {
        engine: 'PostgreSQL 16.2',
        port: 5432,
        multiAz: true,
        tier: 'Isolated DB Subnet',
        securityGroup: 'sg-rds-postgres',
      },
      terraformSnippet: `resource "aws_db_instance" "postgres_primary" {
  identifier          = "zeroradius-postgres-prod"
  engine              = "postgres"
  engine_version      = "16.2"
  instance_class      = "db.r6g.xlarge"
  multi_az            = true
  allocated_storage   = 100
  port                = 5432
}`,
      accentColor: 'amber',
    },
  },
  {
    id: 'node-redis',
    type: 'cache',
    position: { x: 990, y: 310 },
    data: {
      label: 'ElastiCache Redis',
      sublabel: 'aws_elasticache_cluster.redis_cache',
      resourceType: 'In-Memory Key/Value Cache',
      terraformResource: 'aws_elasticache_cluster',
      provider: 'hashicorp/aws',
      status: 'ONLINE',
      metrics: {
        memory: '1.2 GB / 6 GB',
        latency: '0.2ms',
        connections: '228 conn',
      },
      details: {
        engine: 'Redis 7.0',
        port: 6379,
        tier: 'Private Cache Subnet',
        securityGroup: 'sg-redis-cache',
      },
      terraformSnippet: `resource "aws_elasticache_cluster" "redis_cache" {
  cluster_id      = "zeroradius-redis-node"
  engine          = "redis"
  node_type       = "cache.r6g.large"
  port            = 6379
}`,
      accentColor: 'rose',
    },
  },
  {
    id: 'node-storage',
    type: 'storage',
    position: { x: 650, y: 390 },
    data: {
      label: 'S3 Object Vault',
      sublabel: 'aws_s3_bucket.asset_storage',
      resourceType: 'Object Storage Bucket',
      terraformResource: 'aws_s3_bucket',
      provider: 'hashicorp/aws',
      status: 'ONLINE',
      metrics: {
        storage: '412 GB Assets',
      },
      details: {
        tier: 'Standard / Hot Storage',
        securityGroup: 'IAM Role Policy',
      },
      terraformSnippet: `resource "aws_s3_bucket" "asset_storage" {
  bucket = "zeroradius-assets-prod-vault"
  tags = {
    Classification = "Encrypted-Assets"
  }
}`,
      accentColor: 'sky',
    },
  },
];

// Initial glowing edges connecting the cloud architecture
export const INITIAL_EDGES: Edge[] = [
  {
    id: 'edge-gw-alb',
    source: 'node-gateway',
    target: 'node-alb',
    animated: true,
    label: 'HTTPS: 443',
    style: { stroke: '#06b6d4', strokeWidth: 2 },
    data: { protocol: 'HTTPS', port: 443 },
  },
  {
    id: 'edge-alb-webapp',
    source: 'node-alb',
    target: 'node-webapp',
    animated: true,
    label: 'HTTP: 3000',
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    data: { protocol: 'HTTP', port: 3000 },
  },
  {
    id: 'edge-webapp-postgres',
    source: 'node-webapp',
    target: 'node-postgres',
    animated: true,
    label: 'TCP: 5432 (Postgres)',
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    data: { protocol: 'TCP', port: 5432 },
  },
  {
    id: 'edge-webapp-redis',
    source: 'node-webapp',
    target: 'node-redis',
    animated: true,
    label: 'TCP: 6379 (Redis)',
    style: { stroke: '#f43f5e', strokeWidth: 2 },
    data: { protocol: 'TCP', port: 6379 },
  },
  {
    id: 'edge-webapp-storage',
    source: 'node-webapp',
    target: 'node-storage',
    animated: true,
    label: 'HTTPS (IAM Auth)',
    style: { stroke: '#0284c7', strokeWidth: 2 },
    data: { protocol: 'S3 API' },
  },
];
