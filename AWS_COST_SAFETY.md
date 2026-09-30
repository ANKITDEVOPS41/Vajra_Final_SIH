# AWS COST SAFETY GUIDE ($0 BUDGET)

This project uses heavy ML and Geospatial dependencies which can easily cause cloud billing spikes if not managed correctly. Follow this shutdown checklist when you are finished presenting your hackathon project.

## The Shutdown Checklist

1. **ECS Fargate Services (The biggest cost driver)**
   - Navigate to **Elastic Container Service (ECS)**.
   - Select your `VajraCluster`.
   - Under the "Services" tab, select the backend service and click **Update**.
   - Set "Desired tasks" to `0`. This immediately stops billing for compute.
   - Alternatively, just **Delete** the Service and the Cluster entirely.

2. **AWS S3 Storage (Hidden costs for large `.pth` / `.h5` files)**
   - Navigate to **S3**.
   - If you uploaded 5GB+ SEVIR dataset files or PyTorch weights, **empty the bucket**. S3 charges per GB-month.

3. **Elastic Container Registry (ECR)**
   - Navigate to **ECR**.
   - Delete the `vajra-backend` repository. Docker images containing PyTorch can be 1GB+, eating up the 500MB Free Tier storage quickly.

4. **Load Balancers / Nat Gateways / EIP (Silent Costs)**
   - Navigate to **EC2 -> Load Balancers**. Delete any Application Load Balancers.
   - Navigate to **VPC -> NAT Gateways**. Delete NAT gateways (these cost $$ per hour just for existing). Fargate can run in public subnets with auto-assigned IPs for hackathons to avoid NAT costs entirely.
   - Navigate to **EC2 -> Elastic IPs**. Release any unattached IPs.

5. **AWS Amplify (Frontend)**
   - Navigate to **AWS Amplify**.
   - Select the App -> Actions -> **Delete app**.

## Cost Saving Architecure Rules Used

- **CPU PyTorch**: The Dockerfile uses `torch==2.3.1+cpu` which drops the image size by ~1.5GB and prevents requiring an expensive GPU EC2 instance (`p3` etc.).
- **Multi-stage builds**: Reduces Docker size by removing `build-essential`.
- **Scale to Zero**: We do not use persistent EC2 instances, meaning Fargate can be toggled via `Desired Tasks: 0`.
