#!/bin/bash

# Define the Hugo version you want to install
HUGO_VERSION="0.134.1"

# Download the Hugo extended version based on the current OS
echo "Downloading Hugo extended version $HUGO_VERSION..."

# Detect the operating system
OS=$(uname -s)
ARCH=$(uname -m)

# Determine the correct download URL based on OS and architecture
if [ "$OS" = "Linux" ]; then
  if [ "$ARCH" = "x86_64" ]; then
    DOWNLOAD_URL="https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz"
  else
    echo "Unsupported architecture: $ARCH"
    exit 1
  fi
else
  echo "Unsupported operating system: $OS"
  exit 1
fi

# Download the file
wget $DOWNLOAD_URL -O hugo_extended.tar.gz

# Extract the tarball
tar -xvf hugo_extended.tar.gz

# Move the hugo binary to /usr/local/bin (requires sudo if not running as root)
echo "Installing Hugo to /usr/local/bin..."
sudo mv hugo /usr/local/bin/hugo

# Verify installation
hugo version

# Clean up
rm hugo_extended.tar.gz

echo "Hugo extended version $HUGO_VERSION installed successfully!"
