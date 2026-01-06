#!/bin/bash
# Package Chrome extension as .crx file for distribution

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
  --exclude='node_modules' \
  --exclude='tests' \
  --exclude='docs' \
  --exclude='dist' \
  --exclude='scripts' \
  --exclude='.DS_Store' \
  --exclude='*.md' \
  --exclude='package*.json' \
  --exclude='jest.config.js' \
  --exclude='jsconfig.json' \
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

# Create CRX file
CRX_FILE="$DIST_DIR/chrome-extension-richlinker.crx"
PEM_FILE="$DIST_DIR/chrome-extension-richlinker.pem"

# Check if private key exists, create if not
if [ ! -f "$PEM_FILE" ]; then
  echo -e "${YELLOW}Generating new private key...${NC}"
  openssl genrsa -out "$PEM_FILE" 2048
  echo -e "${GREEN}✓ Private key created: $PEM_FILE${NC}"
  echo -e "${YELLOW}⚠ Keep this file safe! It's needed for updates.${NC}"
else
  echo -e "${GREEN}Using existing private key: $PEM_FILE${NC}"
fi

# Generate public key from private key
PUB_KEY_FILE="$DIST_DIR/key.pub"
openssl rsa -pubout -outform DER -in "$PEM_FILE" -out "$PUB_KEY_FILE" 2>/dev/null

# Get the public key for extension ID
PUB_KEY_HEX=$(xxd -p "$PUB_KEY_FILE" | tr -d '\n')

# Create signature
SIG_FILE="$DIST_DIR/signature.bin"
openssl sha256 -binary -sign "$PEM_FILE" < "$ZIP_FILE" > "$SIG_FILE"

# Build CRX file (CRX3 format)
echo -e "${YELLOW}Creating CRX file...${NC}"
(
  # CRX3 header
  printf "Cr24"                    # Magic number
  printf "\x03\x00\x00\x00"        # Version 3

  # Public key length (4 bytes little-endian)
  PUB_LEN=$(wc -c < "$PUB_KEY_FILE")
  printf "\\x$(printf '%02x' $((PUB_LEN & 0xFF)))"
  printf "\\x$(printf '%02x' $(((PUB_LEN >> 8) & 0xFF)))"
  printf "\\x$(printf '%02x' $(((PUB_LEN >> 16) & 0xFF)))"
  printf "\\x$(printf '%02x' $(((PUB_LEN >> 24) & 0xFF)))"

  # Signature length (4 bytes little-endian)
  SIG_LEN=$(wc -c < "$SIG_FILE")
  printf "\\x$(printf '%02x' $((SIG_LEN & 0xFF)))"
  printf "\\x$(printf '%02x' $(((SIG_LEN >> 8) & 0xFF)))"
  printf "\\x$(printf '%02x' $(((SIG_LEN >> 16) & 0xFF)))"
  printf "\\x$(printf '%02x' $(((SIG_LEN >> 24) & 0xFF)))"

  # Public key
  cat "$PUB_KEY_FILE"

  # Signature
  cat "$SIG_FILE"

  # ZIP contents
  cat "$ZIP_FILE"
) > "$CRX_FILE"

# Clean up temporary files
rm -f "$PUB_KEY_FILE" "$SIG_FILE"

echo ""
echo -e "${GREEN}✓ Package created successfully!${NC}"
echo -e "  ZIP:  ${GREEN}$ZIP_FILE${NC}"
echo -e "  CRX:  ${GREEN}$CRX_FILE${NC}"
echo -e "  Key:  ${GREEN}$PEM_FILE${NC}"
echo ""
echo -e "${YELLOW}⚠ Important: Keep $PEM_FILE secret and backed up!${NC}"
echo "  It's needed to sign future updates."
