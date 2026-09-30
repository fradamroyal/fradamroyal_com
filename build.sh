#!/usr/bin/env bash

#------------------------------------------------------------------------------
# @file
# Builds a Hugo site hosted on a Cloudflare Worker.
#
# Wrangler uses the build environment's Node.js. The site uses prebuilt Hugo.
#------------------------------------------------------------------------------

set -euo pipefail

HUGO_VERSION=0.165.0
export TZ=America/Chicago

build_work_dir=$(mktemp -d)
trap 'rm -rf "$build_work_dir"' EXIT

# Install Hugo without depending on persistent installation directories.
echo "Installing Hugo ${HUGO_VERSION}..."
curl --fail --show-error --silent --location --retry 3 \
  --output "${build_work_dir}/hugo.tar.gz" \
  "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_linux-amd64.tar.gz"
tar -C "$build_work_dir" -xzf "${build_work_dir}/hugo.tar.gz"

echo "Verifying Hugo..."
"${build_work_dir}/hugo" version

# Hugo uses Git history for article modification dates.
echo "Configuring Git..."
git config core.quotepath false
repository_is_shallow=$(git rev-parse --is-shallow-repository)
if [ "$repository_is_shallow" = "true" ]; then
  git fetch --unshallow
fi

echo "Building the site..."
"${build_work_dir}/hugo" --gc --minify --buildFuture
