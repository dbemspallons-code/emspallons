#!/usr/bin/env bash
# Wrapper legacy (utiliser scripts/deploy-netlify.sh)
exec "$(dirname "$0")/scripts/deploy-netlify.sh"
