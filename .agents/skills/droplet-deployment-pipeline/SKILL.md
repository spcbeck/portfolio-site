---
name: droplet-deployment-pipeline
description: Use when provisioning, deploying, securing, or automating web application pipelines on DigitalOcean Droplets using systemd, PM2, Docker, Nginx, SSL, or GitHub Actions.
---

# DigitalOcean Droplet Deployment Pipeline

## Overview
Automate and secure web application deployments to DigitalOcean Droplets. This skill provides end-to-end procedures for server hardening, reverse proxy configuration, zero-downtime deployments, process supervision, and automated rollbacks.

---

## 1. Droplet Hardening & Network Baseline

### Initial Server Hardening
When provisioning an Ubuntu LTS Droplet:
1. **Create non-root deployer user**:
   ```bash
   adduser --disabled-password --gecos "" deployer
   usermod -aG sudo deployer
   mkdir -p /home/deployer/.ssh
   cp /root/.ssh/authorized_keys /home/deployer/.ssh/
   chown -R deployer:deployer /home/deployer/.ssh
   chmod 700 /home/deployer/.ssh
   chmod 600 /home/deployer/.ssh/authorized_keys
   ```
2. **Harden SSH (`/etc/ssh/sshd_config`)**:
   ```ini
   PermitRootLogin no
   PasswordAuthentication no
   PubkeyAuthentication yes
   X11Forwarding no
   ```
   Restart SSH: `sudo systemctl restart sshd`.

3. **Firewall Setup (UFW + DO Cloud Firewall)**:
   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow 22/tcp comment 'SSH'
   sudo ufw allow 80/tcp comment 'HTTP'
   sudo ufw allow 443/tcp comment 'HTTPS'
   sudo ufw enable
   ```

---

## 2. Process Supervision

### Production Systemd Service Unit
Create `/etc/systemd/system/web-app.service`:

```ini
[Unit]
Description=Production Web Application Service
After=network.target

[Service]
Type=simple
User=deployer
Group=deployer
WorkingDirectory=/var/www/app/current
EnvironmentFile=/var/www/app/shared/.env
ExecStart=/usr/bin/node /var/www/app/current/server/src/app.js
Restart=always
RestartSec=5s
KillSignal=SIGTERM
TimeoutStopSec=15

# Sandboxing directives
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=full
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable web-app
sudo systemctl start web-app
```

---

## 3. Nginx Reverse Proxy & SSL Configuration
Create `/etc/nginx/sites-available/app`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;

    # SSL Certificates managed by Certbot
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Client limits
    client_max_body_size 20M;

    # Static assets caching
    location /static/ {
        alias /var/www/app/current/client/dist/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Proxy to Node.js / backend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# Obtain SSL:
sudo certbot --nginx -d example.com -d www.example.com
```

---

## 4. Zero-Downtime Atomic Deployment Pipeline
Structure application directories to support instant rollbacks using symbolic links:

```
/var/www/app/
├── current -> /var/www/app/releases/20260902_120000
├── shared/
│   ├── .env (mode 0600)
│   └── uploads/
└── releases/
    ├── 20260902_110000 (previous release)
    └── 20260902_120000 (active release)
```

### Deployment Script (`deploy.sh`)
Execute on the Droplet via CI/CD (GitHub Actions) or SSH:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/app"
REPO_URL="git@github.com:org/repo.git"
BRANCH="${1:-main}"
RELEASE_ID=$(date +%Y%m%d_%H%M%S)
NEW_RELEASE_DIR="$APP_DIR/releases/$RELEASE_ID"

echo "==> Deploying release: $RELEASE_ID on branch $BRANCH"

# 1. Clone fresh release
mkdir -p "$NEW_RELEASE_DIR"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$NEW_RELEASE_DIR"

# 2. Link shared configuration
ln -sfn "$APP_DIR/shared/.env" "$NEW_RELEASE_DIR/.env"

# 3. Install production dependencies and build assets
cd "$NEW_RELEASE_DIR"
npm ci --production=false
npm run build
npm prune --production

# 4. Run database migrations safely
if [ -f "$NEW_RELEASE_DIR/package.json" ]; then
  npm run db:migrate || true
fi

# 5. Swap symbolic link atomically
PREVIOUS_RELEASE=$(readlink -f "$APP_DIR/current" || echo "")
ln -sfn "$NEW_RELEASE_DIR" "$APP_DIR/current_next"
mv -Tf "$APP_DIR/current_next" "$APP_DIR/current"

# 6. Reload process supervisor
sudo systemctl reload-or-restart web-app

# 7. Health Check Verification
echo "==> Running health check verification..."
sleep 3
if curl -fsS http://127.0.0.1:3000/health > /dev/null; then
  echo "==> Deployment SUCCESSFUL"
  # Keep only last 5 releases
  cd "$APP_DIR/releases" && ls -1dt * | tail -n +6 | xargs -r rm -rf
else
  echo "==> Health check FAILED! Initiating automatic rollback..."
  if [ -n "$PREVIOUS_RELEASE" ]; then
    ln -sfn "$PREVIOUS_RELEASE" "$APP_DIR/current_next"
    mv -Tf "$APP_DIR/current_next" "$APP_DIR/current"
    sudo systemctl reload-or-restart web-app
    echo "==> Rolled back to $PREVIOUS_RELEASE"
  fi
  exit 1
fi
```

---

## 5. Deployment Pre-Flight Checklist
- [ ] SSH keys configured for `deployer` user; root login disabled.
- [ ] Firewall (UFW) active with only ports 22, 80, 443 open.
- [ ] Shared `.env` file permissions set to `0600` (readable only by deployer).
- [ ] Zero-downtime symlink mechanism tested with automatic rollback.
- [ ] Health check endpoint (`/health`) returns `200 OK` with database connection status.
- [ ] Nginx configured with HTTP/2, security headers, and Certbot auto-renewal timer.
- [ ] Automated log rotation configured (`/etc/logrotate.d/web-app`).
