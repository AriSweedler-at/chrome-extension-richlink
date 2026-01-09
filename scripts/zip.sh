#!/bin/bash
# Package Chrome extension as ZIP file for distribution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Packaging Chrome Extension${NC}"
echo "================================"

# Create dist directory
DIST_DIR="dist"
mkdir -p "$DIST_DIR"

# Create temporary directory for clean extension files
TEMP_DIR=$(mktemp -d)
echo -e "${YELLOW}Creating temporary directory: $TEMP_DIR${NC}"

# Copy only extension files (exclude dev files)
echo -e "${YELLOW}Copying extension files...${NC}"
rsync -av \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='.claude' \
  --exclude='node_modules' \
  --exclude='tests' \
  --exclude='docs' \
  --exclude='dist' \
  --exclude='scripts' \
  --exclude='coverage' \
  --exclude='.DS_Store' \
  --exclude='*.md' \
  --exclude='package*.json' \
  --exclude='jest.config.js' \
  --exclude='jsconfig.json' \
  --exclude='build.js' \
  --exclude='TESTING.md' \
  --exclude='README.md' \
  . "$TEMP_DIR/"

# Create ZIP file
ZIP_FILE="$(pwd)/$DIST_DIR/chrome-extension-richlinker.zip"
echo -e "${YELLOW}Creating ZIP file: $ZIP_FILE${NC}"
cd "$TEMP_DIR"
zip -r "$ZIP_FILE" .
cd - > /dev/null

# Clean up temp directory
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}✓ ZIP created successfully!${NC}"
echo -e "  Location: ${GREEN}$ZIP_FILE${NC}"
echo ""
echo -e "${YELLOW}Note: CRX files are created by GitHub Actions on release.${NC}"
echo "  Push a version tag to trigger: git tag v0.1.0 && git push origin v0.1.0"
