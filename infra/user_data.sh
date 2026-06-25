#!/bin/bash
set -euo pipefail

APP_DIR="/opt/zoom-assistant-tracker"
APP_USER="zoomapp"
APP_HOSTNAME="${app_hostname}"
AWS_REGION="${aws_region}"
REPOSITORY_URL="${repository_url}"
SSM_PARAMETER_PATH="${ssm_parameter_path}"

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y python3 python3-venv python3-pip git caddy awscli

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

for key in \
  APP_SECRET_KEY \
  ZOOM_CLIENT_ID \
  ZOOM_CLIENT_SECRET \
  ZOOM_OAUTH_REDIRECT_URL \
  ALLOWED_ZOOM_EMAILS \
  FORCE_SECURE_COOKIES \
  CORS_ALLOWED_ORIGINS \
  OPENAI_API_KEY \
  GOOGLE_SERVICE_ACCOUNT_JSON \
  GOOGLE_SHEETS_AUTO_SYNC_ENABLED \
  GOOGLE_SHEETS_AUTO_SYNC_INTERVAL_SECONDS \
  GOOGLE_SHEETS_AUTO_SYNC_REPLACE_EXISTING
do
  value="$(aws ssm get-parameter \
    --region "$AWS_REGION" \
    --name "$SSM_PARAMETER_PATH/$key" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text 2>/dev/null || true)"

  if [ -n "$value" ]; then
    printf '%s=%s\n' "$key" "$value" >> "$APP_DIR/.env"
  fi
done

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
$APP_HOSTNAME {
  reverse_proxy 127.0.0.1:8000
}
CADDY

systemctl daemon-reload
systemctl enable zoom-assistant
systemctl restart zoom-assistant
systemctl enable caddy
systemctl restart caddy
