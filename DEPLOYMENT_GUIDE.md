# DEPLOYMENT GUIDE (AWS Free Tier Optimized)

This guide walks through deploying the VAJRA platform using a cost-optimized, secure AWS footprint designed for student/hackathon budgets.

## Architecture Blueprint

- **Frontend**: Hosted on **AWS Amplify**. Free tier provides 1000 build minutes and 5GB storage. It pulls directly from your GitHub repo.
- **Backend**:
  - **Registry**: AWS ECR (Elastic Container Registry).
  - **Compute**: AWS ECS (Fargate). Container scales to zero when not in use or can be allocated a tiny CPU/Memory slice (e.g., 0.25 vCPU, 0.5GB RAM for basic non-model API, 1GB RAM if running CPU PyTorch inference).
  - **Data Pipelines (ML/GIS)**: `.h5`, `.pth`, `.pt` files stored in AWS S3 and downloaded dynamically on boot or mounted via EFS if persistent caching is needed.

## Deployment Steps

### 1. Backend (AWS ECR + ECS Fargate)

1. **Create an ECR Repository**: Name it `vajra-backend`.
2. **Push the Docker image**: Your CI/CD GitHub Actions or local CLI will push the image.
   _Ensure you are using the provided `Dockerfile` that uses the `python:3.11-slim` image and strips out CUDA / heavy GPU payloads._
3. **Create an ECS Cluster**: Select "Serverless (Fargate)".
4. **Create Task Definition**:
   - Requires the image URL from ECR.
   - Assign minimum resources: `0.5 vCPU`, `1 GB RAM` (Adjust upwards if PyTorch crashes on OOM).
   - Expose port `8000`.
   - Provide the health check `/health`.
5. **Run Service**: Link the Task Definition to the Cluster.

### 2. Frontend (AWS Amplify)

1. Navigate to AWS Amplify console.
2. Connect your GitHub repository.
3. Select the `frontend/` directory as the build destination.
4. Add the `VITE_API_BASE_URL` Environment variable pointing to the generated AWS Load Balancer or ECS Public IP.
5. Provide this build setting if prompted:

```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - "**/*"
      cache:
        paths:
          - node_modules/**/*
    appRoot: frontend
```

### 3. CI/CD

The provided `.github/workflows/ci.yml` is ready. Just add `VITE_API_BASE_URL` to your GitHub Repository Secrets.
