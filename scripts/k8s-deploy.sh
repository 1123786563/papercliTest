#!/bin/bash

# ============================================
# Kubernetes Deployment Script
# ============================================

set -e

# Configuration
NAMESPACE="${NAMESPACE:-prism-era}"
CONTEXT="${CONTEXT:-}"
VERSION="${VERSION:-latest}"
REGISTRY="${REGISTRY:-ghcr.io}"
ORG="${ORG:-prism-era}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check kubectl
check_kubectl() {
  if ! command -v kubectl &> /dev/null; then
    log_error "kubectl is not installed"
    exit 1
  fi
  
  if [ -n "$CONTEXT" ]; then
    kubectl config use-context "$CONTEXT"
  fi
}

# Deploy to Kubernetes
deploy() {
  log_info "Deploying to Kubernetes..."
  log_info "Namespace: ${NAMESPACE}"
  log_info "Version: ${VERSION}"
  
  # Update image tags in kustomization
  cd infra/k8s
  
  # Apply using kustomize
  kubectl apply -k . --namespace="$NAMESPACE"
  
  log_info "Waiting for deployments to be ready..."
  kubectl rollout status deployment/prism-era-web -n "$NAMESPACE" --timeout=300s
  kubectl rollout status deployment/prism-era-api -n "$NAMESPACE" --timeout=300s
  
  log_info "Deployment complete!"
}

# Show status
status() {
  log_info "Deployment status:"
  echo ""
  kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/part-of=prism-era
  echo ""
  kubectl get services -n "$NAMESPACE"
  echo ""
  kubectl get ingress -n "$NAMESPACE"
}

# Rollback
rollback() {
  log_warn "Rolling back deployments..."
  kubectl rollout undo deployment/prism-era-web -n "$NAMESPACE"
  kubectl rollout undo deployment/prism-era-api -n "$NAMESPACE"
  log_info "Rollback complete!"
}

# Main
main() {
  check_kubectl
  
  case "$1" in
    deploy|"")
      deploy
      ;;
    status)
      status
      ;;
    rollback)
      rollback
      ;;
    *)
      log_error "Unknown command: $1"
      echo "Usage: $0 [deploy|status|rollback]"
      exit 1
      ;;
  esac
}

main "$@"