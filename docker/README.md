# Dao Code Docker Sandbox

This directory contains Docker configurations for sandboxed testing environments.

## Default Sandbox Image

**Image**: `dao-code-sandbox:ubuntu24-node`

### Included Software

- **OS**: Ubuntu 24.04 LTS
- **Node.js**: v20.x (LTS)
- **Package Managers**: npm, pnpm, yarn
- **Build Tools**: gcc, g++, make, cmake, build-essential
- **Version Control**: git
- **Programming Languages**: Node.js, Python 3
- **Global Node Packages**: TypeScript, ts-node, tsx, ESLint, Prettier, nodemon, PM2
- **Utilities**: curl, wget, vim, nano, jq, tree, htop, zip/unzip

### Building the Image

```bash
docker build -t dao-code-sandbox:ubuntu24-node -f docker/Dockerfile.sandbox docker/
```

### Running the Sandbox

```bash
docker run -it --rm dao-code-sandbox:ubuntu24-node
```

### Security Features

- Runs as non-root user (`sandbox`)
- Isolated filesystem
- Configurable resource limits

## Custom Images

You can create custom sandbox images by adding new Dockerfiles to this directory.

### Example: Python Sandbox

Create `Dockerfile.python`:

```dockerfile
FROM python:3.12-slim
RUN pip install pytest black mypy
WORKDIR /workspace
CMD ["/bin/bash"]
```

Then register it in your sandbox configuration.
