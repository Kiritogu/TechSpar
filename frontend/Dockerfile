FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
# npm ci:严格按 lockfile 安装(确定性构建;lockfile 不同步会直接失败,CI 已兜底)
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
