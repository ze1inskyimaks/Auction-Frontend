FROM node:20-alpine AS build
WORKDIR /app

ARG REACT_APP_BACKEND_ORIGIN=http://localhost:5041
ENV REACT_APP_BACKEND_ORIGIN=${REACT_APP_BACKEND_ORIGIN}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
