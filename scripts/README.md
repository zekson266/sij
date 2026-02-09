# Build Scripts

## Frontend Build

### Quick Build
```bash
./scripts/build-frontend.sh
```

This script will:
1. Automatically increment the build number
2. Update `build-info.json` files
3. Build the frontend using Docker Compose
4. Ensure the build number is synced to the dist directory

### Manual Build
If you need to build manually:

```bash
# Increment build number
BUILD_NUM=$(cat .build-number 2>/dev/null || echo "0")
BUILD_NUM=$((BUILD_NUM + 1))
echo $BUILD_NUM > .build-number
echo "{\"buildNumber\":\"$BUILD_NUM\"}" > frontend/public/build-info.json
echo "{\"buildNumber\":\"$BUILD_NUM\"}" > frontend/dist/build-info.json

# Build with Docker
docker compose up frontend-build

# Sync build number after build
echo "{\"buildNumber\":\"$BUILD_NUM\"}" > frontend/dist/build-info.json
```

## Important Notes

### Source Files Volume Mount
The `docker-compose.yml` has been configured to mount the entire `frontend` directory as a volume:
```yaml
volumes:
  - ./frontend:/app
  - /app/node_modules
```

This ensures:
- ✅ Latest source files are always available during build
- ✅ No need to rebuild Docker image when source files change
- ✅ `node_modules` is excluded to prevent conflicts

### Build Number
The build number is stored in:
- `.build-number` - Current build number
- `frontend/public/build-info.json` - Accessible at runtime via `/build-info.json`
- `frontend/dist/build-info.json` - Included in the build output

The build number is displayed in the app's AppBar as "Booker B.{buildNumber}".
























