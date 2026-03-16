# Factorio Data Processing in Containers

When running in a container environment (Docker, VS Code dev container, etc.), you need to map your Factorio installation files into the container to run extraction or graphics copying.

## Important

Volume mounts must be configured when starting the container. You cannot attach folders to an already running container.

## Mapping Options

### 1. Docker Volume Mounts (when starting container)

```bash
docker run -v /host/factorio:/container/factorio your-image
```

### 2. Docker Compose (recommended)

```yaml
volumes:
  - /host/factorio:/container/factorio
  - /host/factorio-user:/container/factorio-user
```

### 3. Development Container (VS Code)

```json
"mounts": [
  "source=/host/factorio,target=/container/factorio,type=bind"
]
```

## Required Directories

- **Game folder**: Contains `bin/`, `data/`, etc.
- **User folder** (if separate, e.g. Steam): Contains `mods/`, `script-output/`, etc.

## Example Mapping

- Host: `C:\Program Files\Factorio\`
- Container: `/workspaces/factorio/`

## If Container Is Already Running Without Mounts

### Option 1: Restart container with mounts

1. Stop the container
2. Restart it with the volume mounts
3. Run the processing scripts with the mapped paths

### Option 2: Copy files to running container (no restart required)

Find your container name:

```bash
docker ps --format "{{.Names}}"
```

Then copy files using `docker cp` (replace `CONTAINER_NAME` and paths):

**Single Factorio installation:**

```bash
docker cp "/home/[user]/Games/factorio-space-age/." CONTAINER_NAME:/workspaces/factorio/
```

**Steam installation (separate user folder):**

```bash
# Copy game files
docker cp "/home/[user]/.steam/steam/steamapps/common/Factorio/." CONTAINER_NAME:/workspaces/factorio-game/

# Copy user files
docker cp "/home/[user]/.steam/userdata/[USER_ID]/427520/remote/." CONTAINER_NAME:/workspaces/factorio-user/
```

Files will be copied directly into your container and will be immediately visible.

## Running Scripts After Mapping

Use the standalone scripts with the container paths:

- **Extract** (needs Factorio exe): Run on a machine with Factorio, or use a copy of script-output
- **Graphics**: `node scripts/copy-mod-graphics.js -g /container/factorio -u /container/factorio-user -o ./generated/data/dev`
- **Process**: `node scripts/process-factorio-data.js --script-output /path/to/script-output`
- **Tooltips**: `node scripts/generate-tooltips.js` (reads from `generated/data/dev`)
