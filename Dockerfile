FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY --from=frontend-builder /app/dist/urbancar-ec-frontend/browser /usr/share/nginx/html
COPY nginx/nginx.containerapp.conf /etc/nginx/conf.d/default.conf
COPY nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
