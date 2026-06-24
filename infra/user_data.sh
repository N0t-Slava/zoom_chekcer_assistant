#!/bin/bash
set -euo pipefail

APP_DIR="/opt/zoom-assistant-tracker"
APP_USER="zoomapp"
REPOSITORY_URL="${repository_url}"

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y python3 python3-venv python3-pip git caddy

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

rm -rf "$APP_DIR"
git clone "$REPOSITORY_URL" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

cd "$APP_DIR"
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r backend/requirements.txt

cat > "$APP_DIR/.env" <<ENV
APP_ENV=${app_environment}
ENV

chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

cat > /etc/systemd/system/zoom-assistant.service <<SERVICE
[Unit]
Description=Zoom Assistant Tracker FastAPI app
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=$APP_DIR/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat > /etc/caddy/Caddyfile <<CADDY
:80 {
  reverse_proxy 127.0.0.1:8000
}
CADDY

systemctl daemon-reload
systemctl enable zoom-assistant
systemctl restart zoom-assistant
systemctl enable caddy
systemctl restart caddy
