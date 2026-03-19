#!/bin/bash

# ============================================
# Docker Image Build Script
# ============================================

set -e

# Configuration
REGISTRY="${REGISTRY:-ghcr.io}"
ORG="${ORG:-prism-era}"
VERSION="${VERSION:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Build and push web image
build_web() {
  log_info "Building web image..."
  docker build \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg VERSION="$VERSION" \
    -t "${REGISTRY}/${ORG}/web:${VERSION}" \
    -t "${REGISTRY}/${ORG}/web:latest" \
    -f apps/web/Dockerfile \
    .
  
  log_info "Web image built successfully!"
}

# Build and push api image
build_api() {
  log_info "Building API image..."
  docker build \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg VERSION="$VERSION" \
    -t "${REGISTRY}/${ORG}/api:${VERSION}" \
    -t "${REGISTRY}/${ORG}/api:latest" \
    -f apps/api/Dockerfile \
    .
  
  log_info "API image built successfully!"
}

# Push images to registry
push_images() {
  log_info "Pushing images to registry..."
  
  if [ "$PUSH" = "true" ]; then
    docker push "${REGISTRY}/${ORG}/web:${VERSION}"
    docker push "${REGISTRY}/${ORG}/web:latest"
    docker push "${REGISTRY}/${ORG}/api:${VERSION}"
    docker push "${REGISTRY}/${ORG}/api:latest"
    log_info "Images pushed successfully!"
  else
    log_warn "PUSH not set. Skipping push. Use PUSH=true to push images."
  fi
}

# Main
main() {
  log_info "Starting Docker build process..."
  log_info "Registry: ${REGISTRY}"
  log_info "Organization: ${ORG}"
  log_info "Version: ${VERSION}"
  echo ""
  
  case "$1" in
    web)
      build_web
      ;;
    api)
      build_api
      ;;
    all|"")
      build_web
      build_api
      ;;
    *)
      log_error "Unknown target: $1"
      echo "Usage: $0 [web|api|all]"
      exit 1
      ;;
  esac
  
  push_images
  
  log_info "Build complete!"
  echo ""
  echo "Images:"
  echo "  - ${REGISTRY}/${ORG}/web:${VERSION}"
  echo "  - ${REGISTRY}/${ORG}/web:latest"
  echo "  - ${REGISTRY}/${ORG}/api:${VERSION}"
  echo "  - ${REGISTRY}/${ORG}/api:latest"
}

main "$@"