# Technology Stack

**Analysis Date:** 2026-04-09

## Languages

**Primary:**
- Java 17 - Core server implementation, all business logic
  - Source: `build.gradle` (sourceCompatibility/targetCompatibility VERSION_17)
  - Main class: `src/main/java/org/traccar/Main.java`

**Secondary:**
- XML - Database changelog files (Liquibase), Protocol definitions, OpenAPI spec
  - Changelogs: `schema/changelog-master.xml`
  - API specification: `openapi.yaml`

## Runtime

**Environment:**
- Java 17 (JDK 17+)
- JAR-based executable
  - Manifest: Main-Class `org.traccar.Main`
  - Version: 6.12.2 (from `build.gradle`)

**Package Manager:**
- Gradle 7+ (wrapper included)
  - Wrapper: `gradlew` / `gradlew.bat`
  - Build file: `build.gradle`

## Frameworks

**Core:**
- Jetty 12.1.6 - HTTP/REST server and WebSocket support
  - Packages: `jetty-server`, `jetty-ee10-servlet`, `jetty-ee10-websocket`
  - Used for web server (`src/main/java/org/traccar/web/WebServer.java`)

- Jersey 4.0.2 - REST API framework
  - Packages: `jersey-container-servlet`, `jersey-media-json-jackson`
  - API resources: `src/main/java/org/traccar/api/resource/`

- Netty 4.2.10.Final - Async networking for protocol handlers
  - Packages: `netty-buffer`, `netty-codec`, `netty-codec-http`, `netty-codec-mqtt`, `netty-handler`, `netty-transport`
  - Protocol support: `src/main/java/org/traccar/protocol/`

- Guice 7.0.0 - Dependency injection
  - Packages: `guice`, `guice-servlet`
  - DI configuration: `DatabaseModule`, `WebModule`

**Database:**
- Liquibase 5.0.1 - Database schema management and migrations
  - Changelog file: `schema/changelog-master.xml`
  - Configuration key: `database.changelog`

**Testing:**
- JUnit Jupiter 6.0.3 - Unit testing framework
  - Test config: `test { useJUnitPlatform() }`
  - Test directory: `src/test/java/org/traccar/`

- Mockito 5.21.0 - Mocking for unit tests

**Build/Dev:**
- Checkstyle 10.23.1 - Code style enforcement
  - Config: `gradle/checkstyle.xml`
  - Enabled during build

- Gradle Ben-Manes versions plugin 0.53.0 - Dependency update detection
  - Task: `gradle dependencyUpdates`

- Protocol Buffers 4.33.5 - Binary serialization format support
  - Gradle plugin: `com.google.protobuf` 0.9.6
  - Compiler: `protoc` 4.33.5

## Key Dependencies

**Critical:**
- HikariCP 7.0.2 - Database connection pooling
  - Configured via `database.maxPoolSize` key
  - Default pool size managed by HikariCP

- Jackson 2.x (version resolved transitively) - JSON serialization/deserialization
  - Packages: `jackson-databind`, `jackson-jaxrs-json-provider`, `jackson-datatype-jakarta-jsonp`, `jackson-module-blackbird`

- SLF4J 2.0.17 with JDK14 - Logging framework
  - Package: `slf4j-jdk14`
  - Used throughout: `import org.slf4j.Logger`

**Infrastructure:**
- Commons Codec 1.21.0 - Encoding/decoding utilities
- Commons Collections 4.5.0 - Collection utilities
- Commons JEXL 3.6.2 - Expression language for rules
- Apache Velocity 2.4.1 - Template engine for reports
- JXLS 2.14.0 - Excel export for reports
- iCal4j 4.2.3 - Calendar/scheduling support
- JTS 1.20.0 / Spatial4j 0.8 - Geospatial calculations
- JNA 5.18.1 / JNR-POSIX 3.1.21 - Native platform access

## Configuration

**Environment:**
- File-based configuration (not env-based by default)
  - Property keys defined in `src/main/java/org/traccar/config/Keys.java`
  - Configuration loading: `src/main/java/org/traccar/config/Config.java`
  - Config types: CONFIG, DEVICE, USER, SERVER

**Key Configuration Areas:**
- Database: `database.url`, `database.driver`, `database.user`, `database.password`
- Web server: `web.address`, `web.port`, `web.cache`
- Protocols: Dynamic per-protocol config with `.port`, `.address`, `.ssl`, `.timeout` suffixes
- Authentication: LDAP, OpenID Connect, TOTP support
- Notifications: Email (SMTP), SMS, Firebase, Telegram, WhatsApp, Pushover
- Data forwarding: Kafka, AMQP (RabbitMQ), Redis, MQTT, HTTP
- Geocoding: Multiple provider integrations
- Geolocation: Google, OpenCellId, Unwired Labs providers

**Build:**
- `build.gradle` - Gradle build configuration
- `settings.gradle` - Project name and structure
- `.gitignore` - Standard git ignore file
- `gradle/checkstyle.xml` - Checkstyle configuration
- `.DS_Store`, `.claude/` - Development environment files

## Platform Requirements

**Development:**
- JDK 17 or newer
- Gradle 7.0+ (wrapper provided)
- Any OS supported by Java

**Production:**
- Java Runtime Environment (JRE) 17+
- SQL database (H2, MySQL, MariaDB, PostgreSQL, MSSQL, or SQLite)
- Optional: Redis, Kafka, RabbitMQ, MQTT broker (for distributed features)
- Optional: SMTP server (for email notifications)
- Optional: External APIs (Google, Firebase, AWS, etc.)

**Java Version Enforcement:**
- Max JDK version check: 17 (enforced via gradle-enforcer)
- Bytecode version: 17

---

*Stack analysis: 2026-04-09*
