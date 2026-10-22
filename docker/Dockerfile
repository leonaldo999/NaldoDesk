FROM node:22-alpine AS assets

WORKDIR /app
COPY backend/ ./
RUN npm ci && npm run build

FROM php:8.5-fpm-trixie AS app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev libzip-dev \
    && apt-mark manual libpq5 libzip5 \
    && docker-php-ext-install -j2 pdo_pgsql zip \
    && apt-get purge -y --auto-remove libpq-dev libzip-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY backend/ ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache
COPY --from=assets /app/public/build/ ./public/build/

EXPOSE 9000
CMD ["php-fpm"]

FROM nginx:1.31-alpine AS nginx

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY backend/public/ /var/www/html/public/
COPY --from=assets /app/public/build/ /var/www/html/public/build/
RUN mkdir -p /var/www/html/storage/app/public \
    && ln -s /var/www/html/storage/app/public /var/www/html/public/storage

EXPOSE 80

FROM app AS tests

RUN cp .env.example .env \
    && composer install --no-interaction --prefer-dist --optimize-autoloader
CMD ["php", "artisan", "test"]
