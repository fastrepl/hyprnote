FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
