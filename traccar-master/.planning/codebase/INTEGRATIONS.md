# External Integrations

**Analysis Date:** 2026-04-09

## APIs & External Services

**Geolocation Providers:**
- Google Geolocation API - Cell/WiFi-based location lookup
  - SDK/Client: `GoogleGeolocationProvider` in `src/main/java/org/traccar/geolocation/GoogleGeolocationProvider.java`
  - Auth: API key required
  - URL: `https://www.googleapis.com/geolocation/v1/geolocate`

- OpenCellId - Cell tower location database
  - Implementation: `OpenCellIdGeolocationProvider`
  - Auth: API key configuration

- Unwired Labs - Cell/WiFi geolocation
  - Implementation: `UnwiredGeolocationProvider`
  - Auth: API key configuration

- Universal Provider - Fallback/wrapper for geolocation services
  - Implementation: `UniversalGeolocationProvider`

**Geocoding Providers (Address Lookup):**
Multiple providers in `src/main/java/org/traccar/geocoder/`:
- Google Geocoder
- Nominatim (OpenStreetMap)
- Bing Maps
- Here Maps
- MapBox
- TomTom
- MapQuest
- LocationIQ
- OpenCage
- Gisgraphy
- GeocodeXyz
- GeocodeFarm
- Factual
- PositionStack
- GeoapifyGeocoder
- MapmyIndiaGeocoder
- MapTilerGeocoder
- PlusCodesGeocoder
- BanGeocoder (Adresse data - France)

**Speed Limit Provider:**
- Overpass API - OpenStreetMap speed limit data
  - Implementation: `OverpassSpeedLimitProvider` in `src/main/java/org/traccar/speedlimit/OverpassSpeedLimitProvider.java`

**Telemetry & Location Services:**
- Wialon CMS - GPS tracking platform integration
  - Forwarder: `PositionForwarderWialon` in `src/main/java/org/traccar/forward/PositionForwarderWialon.java`

## Data Storage

**Databases:**
- H2 Database 2.4.240 (default, in-memory option)
  - Connection: Configured via `database.url` (default H2)
  - Config keys: `DATABASE_DRIVER`, `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`
  - File: `src/main/java/org/traccar/config/Keys.java` lines 507-530

- MySQL 9.6.0 (MySQL Connector/J)
  - Driver class: `com.mysql.jdbc.Driver`
  - Config key: `database.driver`

- PostgreSQL 42.7.10
  - Client: PostgreSQL JDBC Driver
  - Supported in config

- MariaDB 3.5.7 (MariaDB JDBC Client)
  - Unix socket support via junixsocket-mysql

- Microsoft SQL Server 13.2.1
  - JDBC driver: `mssql-jdbc`
  - Auth: Supports Azure identity (`com.azure:azure-identity:1.18.2`)

**Connection Management:**
- HikariCP 7.0.2 - Connection pooling
  - Config: `database.maxPoolSize`
  - Default: HikariCP's built-in defaults
  - Health check query: `database.checkConnection` (default: `SELECT 1`)

**Schema Management:**
- Liquibase 5.0.1 - Versioned migrations
  - Master changelog: `schema/changelog-master.xml`
  - Incremental updates for versions 4.0 through 6.13

**File Storage:**
- Local filesystem only
  - Web assets: `./target/` (build output)
  - Database files: Local H2 database (default)
  - Template root: `templates/` (configured via `TEMPLATES_ROOT`)

**Caching:**
- Redis 7.3.0 (Jedis client)
  - Implementation: Broadcast/session caching via Redis
  - Used by: `BroadcastService`, `MulticastBroadcastService`
  - Config key: Redis connection URL/settings

## Authentication & Identity

**Auth Provider:**
- Custom implementation with multiple backends
  - Login service: `src/main/java/org/traccar/api/security/LoginService.java`
  - Permissions: `PermissionsService.java`

**LDAP:**
- LDAP/Active Directory authentication
  - Implementation: `LdapProvider` in `src/main/java/org/traccar/database/LdapProvider.java`
  - Config keys: `LDAP_URL`, `LDAP_USER`, `LDAP_PASSWORD`, `LDAP_BASE`, `LDAP_ID_ATTRIBUTE`, `LDAP_NAME_ATTRIBUTE`, `LDAP_MAIL_ATTRIBUTE`, `LDAP_SEARCH_FILTER`, `LDAP_ADMIN_FILTER`, `LDAP_ADMIN_GROUP`, `LDAP_FORCE`
  - File location: `src/main/java/org/traccar/config/Keys.java` lines 623-699

**OpenID Connect (OAuth 2.0/OIDC):**
- OpenID Connect support via NimbusDS SDK
  - SDK: `com.nimbusds:oauth2-oidc-sdk:11.33`
  - Implementation: `OpenIdProvider` in `src/main/java/org/traccar/database/OpenIdProvider.java`
  - Config keys: `OPENID_CLIENT_ID`, `OPENID_CLIENT_SECRET`, `OPENID_ISSUER_URL`, `OPENID_AUTH_URL`, `OPENID_TOKEN_URL`, `OPENID_USERINFO_URL`, `OPENID_GROUPS_CLAIM_NAME`, `OPENID_ALLOW_GROUP`, `OPENID_ADMIN_GROUP`, `OPENID_FORCE`, `OPENID_CLIENTS`
  - File location: `src/main/java/org/traccar/config/Keys.java` lines 705-795

**Two-Factor Authentication:**
- TOTP (Time-based One-Time Password)
  - Library: `com.warrenstrange:googleauth:1.5.0`
  - Config keys: `WEB_TOTP_ENABLE`, `WEB_TOTP_FORCE`

## Monitoring & Observability

**Error Tracking:**
- Not detected in base codebase
- Framework agnostic (can be added via external SDKs)

**Logs:**
- SLF4J with JDK 14 handler
  - Logger: `org.slf4j.Logger`
  - Implementation: `org.slf4j:slf4j-jdk14:2.0.17`
  - All packages use standard SLF4J logging

**Health Monitoring:**
- Database connection health check
  - Config: `database.checkConnection`
  - Default query: `SELECT 1`

## CI/CD & Deployment

**Hosting:**
- Self-hosted (no cloud-specific integrations)
- Docker support available
  - Directory: `docker/` (contains Docker configuration)
  - Docker Compose files available

**Build Artifacts:**
- Executable JAR
  - Output directory: `target/`
  - Manifest Main-Class: `org.traccar.Main`
  - Version: 6.12.2
  - Includes all dependencies copied to `lib/` subdirectory

**CI Pipeline:**
- GitHub Actions workflow available
  - Directory: `.github/`

## Environment Configuration

**Required Environment Variables:**
- None by default (file-based configuration)
- Optional: Java system properties can override config file values

**Configuration File:**
- Default location: `traccar.conf` (Java properties format)
- Alternative: Environment-specific paths via startup arguments

**Critical Configuration Keys:**
- `database.url` - Database connection string
- `database.driver` - JDBC driver class
- `database.user` - Database username
- `database.password` - Database password
- `web.port` - Web server port
- `web.address` - Web server bind address
- Protocol ports: `[protocol].port` (dynamic per protocol)

**Secrets Location:**
- Configuration file (traccar.conf) - store credentials here
- Database: credentials in config
- API keys: configuration keys (SMS, email, notifications)
- LDAP/OpenID: credentials in config
- Environment: Optionally via Java system properties

## Webhooks & Callbacks

**Incoming:**
- REST API endpoints
  - Location: `src/main/java/org/traccar/api/resource/`
  - Multiple resource classes for different entities

**Outgoing:**
- Position Forwarding
  - Types: URL, JSON, Kafka, AMQP, MQTT, Redis, Wialon
  - Forwarders: `src/main/java/org/traccar/forward/`
  - Config keys: `FORWARD_TYPE`, `FORWARD_URL`, `FORWARD_TOPIC`, `FORWARD_EXCHANGE`, `FORWARD_HEADER`
  - Retry logic: `FORWARD_RETRY_ENABLE`, `FORWARD_RETRY_DELAY`, `FORWARD_RETRY_COUNT`, `FORWARD_RETRY_LIMIT`
  - File location: `src/main/java/org/traccar/config/Keys.java` lines 934-1013

- Event Forwarding
  - Types: JSON, Kafka, AMQP
  - Config keys: `EVENT_FORWARD_TYPE`, `EVENT_FORWARD_URL`, `EVENT_FORWARD_EXCHANGE`, `EVENT_FORWARD_TOPIC`, `EVENT_FORWARD_HEADERS`
  - File location: `src/main/java/org/traccar/config/Keys.java` lines 1016-1053

## Message Queues & Streaming

**Kafka 4.2.0:**
- Apache Kafka client for position/event publishing
  - Implementation: `PositionForwarderKafka`, `EventForwarderKafka` in `src/main/java/org/traccar/forward/`
  - Config: Topic and broker configuration via keys

**RabbitMQ (AMQP 0.9.1):**
- AMQP client library 5.28.0
  - Implementations: `PositionForwarderAmqp`, `EventForwarderAmqp`, `AmqpClient`
  - Exchange/routing key config: `FORWARD_EXCHANGE`, `FORWARD_TOPIC`

**MQTT:**
- HiveMQ MQTT client 1.3.12 (MQTT 5.0 protocol)
  - Implementation: `MqttClient`, `PositionForwarderMqtt`
  - Location: `src/main/java/org/traccar/forward/`

**Redis:**
- Jedis 7.3.0 - Redis Java client
  - Implementation: `PositionForwarderRedis`
  - Used for caching and position forwarding

## Notification Services

**Email:**
- SMTP (configurable)
  - Implementation: `src/main/java/org/traccar/mail/`
  - Config keys: `MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_TRANSPORT_PROTOCOL`, `MAIL_SMTP_STARTTLS_ENABLE`, `MAIL_SMTP_STARTTLS_REQUIRED`, `MAIL_SMTP_SSL_ENABLE`, `MAIL_SMTP_USERNAME`, `MAIL_SMTP_PASSWORD`, `MAIL_SMTP_FROM`, `MAIL_SMTP_FROM_NAME`
  - Client: `jakarta.mail:jakarta.mail:2.0.2`
  - File location: `src/main/java/org/traccar/config/Keys.java` lines 1087-1171

**SMS:**
- HTTP-based SMS gateway
  - Config: `SMS_HTTP_URL`, `SMS_HTTP_AUTHORIZATION`, `SMS_HTTP_TEMPLATE`
  - Implementation: `HttpSmsClient` in `src/main/java/org/traccar/sms/`

- AWS SNS (Simple Notification Service)
  - SDK: `software.amazon.awssdk:sns:2.41.34`
  - Implementation: `SnsSmsClient` in `src/main/java/org/traccar/sms/`
  - Auth: `SMS_AWS_ACCESS`, `SMS_AWS_SECRET`, `SMS_AWS_REGION`
  - File location: `src/main/java/org/traccar/config/Keys.java` lines 1218-1237

**Push Notifications:**
- Firebase Cloud Messaging
  - SDK: `com.google.firebase:firebase-admin:9.7.1`
  - Implementation: `NotificatorFirebase` in `src/main/java/org/traccar/notificators/`
  - Auth: Service account JSON file (config key: `NOTIFICATOR_FIREBASE_SERVICE_ACCOUNT`)

**In-App Notifications:**
- Traccar proprietary API
  - Config key: `NOTIFICATOR_TRACCAR_KEY`
  - Implementation: `NotificatorTraccar`

**Third-Party Notification Providers:**
- Pushover - Push notifications
  - Config keys: `NOTIFICATOR_PUSHOVER_USER`, `NOTIFICATOR_PUSHOVER_TOKEN`

- Telegram Bot API
  - Config keys: `NOTIFICATOR_TELEGRAM_KEY`, `NOTIFICATOR_TELEGRAM_CHAT_ID`, `NOTIFICATOR_TELEGRAM_SEND_LOCATION`, `NOTIFICATOR_TELEGRAM_PROXY_URL`
  - Implementation: `NotificatorTelegram`

- WhatsApp Cloud API
  - Config keys: `NOTIFICATOR_WHATSAPP_TOKEN`, `NOTIFICATOR_WHATSAPP_PHONE_NUMBER_ID`, `NOTIFICATOR_WHATSAPP_TEMPLATE_NAME`, `NOTIFICATOR_WHATSAPP_TEMPLATE_LANGUAGE`
  - Implementation: `NotificatorWhatsapp`

**Web Notifications:**
- WebSocket-based in-browser notifications
  - Implementation: `NotificatorWeb`

## Device Command Support

**Traccar Client App:**
- Firebase service account for push commands
  - Config: `COMMAND_CLIENT_SERVICE_ACCOUNT`
  - Implementation: `src/main/java/org/traccar/command/`

**Google Find Hub Integration:**
- FindHub device management API
  - Config keys: `COMMAND_FIND_HUB_URL`, `COMMAND_FIND_HUB_KEY`
  - Per-device configuration

## Other Integrations

**Model Context Protocol (MCP):**
- MCP SDK 0.18.1 - AI/LLM integration support
  - Package: `io.modelcontextprotocol.sdk:mcp:0.18.1`
  - Enables AI assistant capabilities

**Google Open Location Code:**
- Plus Codes geolocation format
  - Package: `com.google.openlocationcode:openlocationcode:1.0.4`
  - Provides compact location codes

**Protocol Buffers:**
- Binary serialization format support
  - Gradle plugin: `com.google.protobuf` 0.9.6
  - Used for efficient data serialization

---

*Integration audit: 2026-04-09*
