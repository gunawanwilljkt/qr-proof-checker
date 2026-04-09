# Codebase Structure

**Analysis Date:** 2026-04-09

## Directory Layout

```
traccar-master/
├── src/main/java/org/traccar/          # Core Java implementation
│   ├── protocol/                        # 200+ GPS device protocol implementations
│   ├── api/                             # REST API layer (resources, security, filters)
│   ├── handler/                         # Position processing pipeline handlers
│   │   ├── events/                      # Event detection handlers
│   │   └── network/                     # Netty channel lifecycle handlers
│   ├── session/                         # Device session and connection management
│   │   ├── cache/                       # In-memory caching service
│   │   └── state/                       # Device state models
│   ├── storage/                         # Storage abstraction layer
│   │   └── query/                       # Query builder for database operations
│   ├── database/                        # Database service managers
│   ├── model/                           # Core data models (Position, Device, Event, etc.)
│   ├── config/                          # Configuration management
│   ├── notification/                    # Notification generation and dispatch
│   ├── notificators/                    # Email/SMS notification implementations
│   ├── web/                             # Jetty web server, servlets, filters
│   ├── broadcast/                       # Multi-instance broadcasting services
│   ├── forward/                         # Position/event forwarding (AMQP, Kafka, Redis)
│   ├── geocoder/                        # Reverse geolocation services
│   ├── geolocation/                     # Cell tower geolocation services
│   ├── geofence/                        # Geofence processing
│   ├── speedlimit/                      # Speed limit services
│   ├── schedule/                        # Scheduled task management
│   ├── reports/                         # Report generation
│   ├── mail/                            # Email service
│   ├── sms/                             # SMS service
│   ├── command/                         # Command models
│   ├── helper/                          # Utility classes
│   ├── Main.java                        # Application entry point
│   ├── MainModule.java                  # Guice dependency injection configuration
│   ├── ServerManager.java               # Protocol server manager
│   ├── ProcessingHandler.java           # Singleton position processing orchestrator
│   ├── BasePipeline*.java               # Pipeline construction abstractions
│   ├── BaseProtocol*.java               # Protocol abstraction base classes
│   ├── TrackerServer/Client.java        # TCP/UDP server and client implementations
│   └── [Netty/Protocol base classes]    # Frame decoders, protocol decoders/encoders
│
├── src/main/resources/
│   └── META-INF/services/               # Java SPI service provider configs
│
├── src/test/java/org/traccar/           # Mirror of main structure with tests
│   └── [protocol, handler, etc]/        # Test cases for each module
│
├── schema/                              # Database schema files (SQL)
│   ├── db/                              # Main schema files by database type
│   │   ├── mysql/                       # MySQL schema
│   │   ├── postgresql/                  # PostgreSQL schema
│   │   ├── h2/                          # H2 schema
│   │   └── [other databases]/           # Microsoft SQL Server, MariaDB
│   └── [migration scripts]/
│
├── docker/                              # Docker configurations
│   ├── docker-compose.yml               # Docker Compose setup
│   └── [Dockerfile variants]/           # Container images
│
├── setup/                               # Installation/setup scripts and templates
│   ├── [platform-specific]/             # Windows, Linux, macOS installers
│   └── [config templates]/
│
├── templates/                           # Email/SMS notification templates
│   └── [notification type templates]/
│
├── tools/                               # Build and utility tools
│   └── [gradle plugins, scripts]/
│
├── build.gradle                         # Gradle build configuration (Java 17)
├── gradle/                              # Gradle wrapper and configs
├── debug.xml                            # Default development configuration
├── openapi.yaml                         # API specification
├── README.md                            # Project overview
├── LICENSE.txt                          # Apache 2.0 license
└── .planning/codebase/                  # GSD codebase mapping documents
    ├── ARCHITECTURE.md
    ├── STRUCTURE.md
    ├── CONVENTIONS.md
    └── TESTING.md
```

## Directory Purposes

**src/main/java/org/traccar/protocol/:**
- Purpose: GPS device protocol implementations (200+ protocols)
- Contains: Protocol classes, frame decoders, protocol decoders, protocol encoders
- Key files: One directory per protocol (e.g., `AdmProtocol.java`, `AdmFrameDecoder.java`, `AdmProtocolDecoder.java`, `AdmProtocolEncoder.java`)
- Pattern: Each protocol follows standard naming: `{Protocol}Protocol`, `{Protocol}FrameDecoder`, `{Protocol}ProtocolDecoder`, `{Protocol}ProtocolEncoder`
- Scaling: 200+ implementations require organized scanning via ClassScanner in ServerManager

**src/main/java/org/traccar/api/:**
- Purpose: REST API implementation
- Contains: Resource classes (@Path endpoints), security filters, error handlers
- Key files: `BaseResource.java` (base for all endpoints), `BaseObjectResource.java` (CRUD template)
- Subdirectories: `resource/` (endpoint classes), `security/` (authentication/authorization)

**src/main/java/org/traccar/api/resource/:**
- Purpose: REST endpoint implementations
- Contains: One class per entity type
- Key files: `DeviceResource.java`, `PositionResource.java`, `EventResource.java`, `UserResource.java`, `GeofenceResource.java`, `NotificationResource.java`
- Pattern: `@Path("/devices")` with GET/POST/PUT/DELETE methods extending BaseResource

**src/main/java/org/traccar/api/security/:**
- Purpose: Authentication and authorization
- Contains: UserPrincipal, PermissionsService, authentication providers
- Key files: `TokenManager.java` (JWT), `LdapProvider.java`, `OpenIdProvider.java`

**src/main/java/org/traccar/handler/:**
- Purpose: Position processing handlers
- Contains: Chain of handlers that process positions sequentially
- Key files:
  - `BasePositionHandler.java` - base class with onPosition() callback pattern
  - `DatabaseHandler.java` - persists positions to storage
  - `TimeHandler.java` - normalizes timestamps
  - `DistanceHandler.java` - calculates trip distance
  - `MotionHandler.java` - detects motion state
  - `GeocoderHandler.java` - async reverse geolocation
  - `FilterHandler.java` - removes invalid positions
  - `PositionForwardingHandler.java` - sends to external systems
- Pattern: Each handler implements onPosition(Position, Callback) and calls callback.processed() to chain

**src/main/java/org/traccar/handler/events/:**
- Purpose: Event detection from position changes
- Contains: Event handler implementations
- Key files: `BaseEventHandler.java`, `GeofenceEventHandler.java`, `MotionEventHandler.java`, `OverspeedEventHandler.java`, `AlarmEventHandler.java`
- Pattern: Each analyzes position state and calls callback.eventDetected(Event) when condition met

**src/main/java/org/traccar/handler/network/:**
- Purpose: Netty channel lifecycle management
- Contains: Channel event handlers
- Key files: `MainEventHandler.java` (connect/disconnect/timeout), `StandardLoggingHandler.java`, `AcknowledgementHandler.java`

**src/main/java/org/traccar/session/:**
- Purpose: Device session and connection state
- Key files:
  - `DeviceSession.java` - per-device connection context (device ID, channel, protocol)
  - `ConnectionManager.java` - tracks online/offline states
  - `cache/CacheManager.java` - in-memory cache of positions, devices, users

**src/main/java/org/traccar/storage/:**
- Purpose: Data persistence abstraction
- Key files:
  - `Storage.java` - abstract interface for CRUD operations
  - `DatabaseStorage.java` - JDBC implementation via HikariCP
  - `MemoryStorage.java` - in-memory implementation for tests
  - `query/` - query builder classes

**src/main/java/org/traccar/database/:**
- Purpose: Business service managers
- Key files:
  - `NotificationManager.java` - generates and sends notifications
  - `CommandsManager.java` - manages device commands
  - `MediaManager.java` - handles media storage
  - `BufferingManager.java` - buffers positions during downtime

**src/main/java/org/traccar/model/:**
- Purpose: Core data model classes
- Key files:
  - `Position.java` - GPS position with attributes (speed, altitude, fuel, etc.)
  - `Device.java` - tracker device
  - `Event.java` - detected system event
  - `User.java` - user account
  - `Geofence.java` - geofenced area
  - `Notification.java` - alert rules
  - `Command.java` - device command
  - `BaseModel.java` - base class with ID field

**src/main/java/org/traccar/config/:**
- Purpose: Configuration management
- Key files:
  - `Config.java` - singleton config loader and accessor
  - `Keys.java` - centralized config key definitions

**src/main/java/org/traccar/web/:**
- Purpose: Jetty web server and HTTP handling
- Key files:
  - `WebServer.java` - startup and configuration
  - `WebModule.java` - Jersey/Jetty dependency injection

**src/main/java/org/traccar/notification/:**
- Purpose: Notification orchestration
- Key files: `NotificationManager.java`, event-based notification triggers

**src/main/java/org/traccar/notificators/:**
- Purpose: Email/SMS notification implementations
- Key files: `MailNotificator.java`, `SmsNotificator.java`

**src/main/java/org/traccar/forward/:**
- Purpose: Forward positions/events to external systems
- Key files: `PositionForwarder.java` (interface), implementations for JSON, AMQP, Kafka, Redis, MQTT, HTTP

**src/main/java/org/traccar/geocoder/:**
- Purpose: Reverse geolocation services
- Key files: Implementations for Google, Nominatim, MapQuest, Here, TomTom, etc.
- Pattern: Call async, cache results

**src/main/java/org/traccar/geolocation/:**
- Purpose: Cell tower-based location estimation
- Key files: Implementations for Google, Unwired, OpenCellId

**src/main/java/org/traccar/helper/:**
- Purpose: Utility classes
- Key files: `DataConverter.java`, `NetworkUtil.java`, `PositionLogger.java`, `ClassScanner.java`

**schema/:**
- Purpose: Database schema migrations
- Structure: Separate directories for each database type (mysql, postgresql, h2, mssql, mariadb)
- Files: SQL scripts for schema creation and migrations

**docker/:**
- Purpose: Container deployment configurations
- Key files: `docker-compose.yml` with traccar service definition

**templates/:**
- Purpose: Email/SMS notification message templates
- Format: Velocity templates for dynamic content

## Key File Locations

**Entry Points:**
- `src/main/java/org/traccar/Main.java`: Application bootstrap
- `src/main/java/org/traccar/ServerManager.java`: Protocol server startup
- `src/main/java/org/traccar/web/WebServer.java`: REST API server startup

**Configuration:**
- `debug.xml`: Development default configuration
- `build.gradle`: Gradle build configuration (Java 17 target, dependencies)
- `src/main/java/org/traccar/config/Config.java`: Configuration loader

**Core Logic:**
- `src/main/java/org/traccar/ProcessingHandler.java`: Position processing orchestrator
- `src/main/java/org/traccar/ServerManager.java`: Protocol loader and connector manager
- `src/main/java/org/traccar/MainModule.java`: Guice dependency injection bindings

**Testing:**
- `src/test/java/org/traccar/`: Mirror of main structure with test cases
- Key test pattern: One test class per source class (e.g., `AdmProtocolDecoderTest.java`)

## Naming Conventions

**Files:**
- Protocol classes: `{Protocol}Protocol.java` (extends BaseProtocol)
- Protocol decoders: `{Protocol}ProtocolDecoder.java` (extends BaseProtocolDecoder)
- Protocol encoders: `{Protocol}ProtocolEncoder.java` (extends BaseProtocolEncoder)
- Frame decoders: `{Protocol}FrameDecoder.java` (extends BaseFrameDecoder)
- Handlers: `{Feature}Handler.java` (extends BasePositionHandler or BaseEventHandler)
- API resources: `{Entity}Resource.java` (extends BaseResource, @Path("/entity"))
- Managers/Services: `{Feature}Manager.java` or `{Feature}Service.java`
- Tests: `{Class}Test.java` in mirror package structure

**Directories:**
- Functional grouping: `handler/`, `storage/`, `api/`, `protocol/`
- Subdirectories for specialization: `handler/events/`, `handler/network/`, `api/security/`, `api/resource/`

**Classes:**
- CamelCase with meaningful prefixes/suffixes: `Base*`, `*Handler`, `*Manager`, `*Service`, `*Decoder`, `*Encoder`
- Abstract: `Base*` (e.g., `BasePositionHandler`, `BaseProtocol`)
- Interface: No prefix, named as capability (e.g., `Storage`, `Protocol`, `Geocoder`)

**Packages:**
- Hierarchical by function: `org.traccar.{domain}.{subdomain}`
- Examples: `org.traccar.handler.events`, `org.traccar.api.resource`, `org.traccar.storage.query`

## Where to Add New Code

**New GPS Protocol:**
1. Create `src/main/java/org/traccar/protocol/{Protocol}Protocol.java` extending BaseProtocol
2. Create decoder: `src/main/java/org/traccar/protocol/{Protocol}ProtocolDecoder.java`
3. Create encoder (if device accepts commands): `src/main/java/org/traccar/protocol/{Protocol}ProtocolEncoder.java`
4. Create frame decoder if needed: `src/main/java/org/traccar/protocol/{Protocol}FrameDecoder.java`
5. Register in Protocol: call `addServer()` or `addClient()` with TrackerServer/TrackerClient instances
6. Create test: `src/test/java/org/traccar/protocol/{Protocol}ProtocolDecoderTest.java`

**New Position Processing Handler:**
1. Create in `src/main/java/org/traccar/handler/{Feature}Handler.java` extending BasePositionHandler
2. Implement `onPosition(Position position, Callback callback)`
3. Perform processing logic
4. Call `callback.processed(boolean success)` to chain to next handler
5. Register in `ProcessingHandler.java` initialization block in position handlers stream
6. Create test in `src/test/java/org/traccar/handler/{Feature}HandlerTest.java`

**New Event Detection:**
1. Create in `src/main/java/org/traccar/handler/events/{Event}EventHandler.java` extending BaseEventHandler
2. Implement `onPosition(Position position, Callback callback)`
3. Analyze position state, call `callback.eventDetected(event)` when condition met
4. Register in `ProcessingHandler.java` event handlers stream

**New REST API Endpoint:**
1. Create `src/main/java/org/traccar/api/resource/{Entity}Resource.java` extending BaseResource
2. Use `@Path("/{resource}")`, `@GET/@POST/@PUT/@DELETE` annotations
3. Inject Storage and PermissionsService via `@Inject`
4. Implement methods accessing `storage.getObjects()` etc., checking permissions
5. Routes automatically picked up by Jersey

**New Notification Type:**
1. Create notificator in `src/main/java/org/traccar/notificators/{Type}Notificator.java`
2. Implement sending logic (email, SMS, webhook, etc.)
3. Create template in `templates/{type}.vm` with Velocity syntax
4. Register in MainModule.java notificator bindings

**Utilities:**
- Place in `src/main/java/org/traccar/helper/{Feature}Utility.java` or `{Feature}Helper.java`

**Tests:**
- Create test in parallel package structure under `src/test/java/`
- Use same class name as source with `Test` suffix

## Special Directories

**schema/:**
- Purpose: Database schema migrations
- Generated: No (manually maintained SQL files)
- Committed: Yes
- Usage: Run during database initialization via Config-specified migration strategy

**docker/:**
- Purpose: Container deployment definitions
- Generated: No
- Committed: Yes
- Usage: `docker-compose up` for quick deployment

**templates/:**
- Purpose: Email/SMS notification message templates
- Generated: No
- Committed: Yes
- Format: Velocity template language (.vm files)
- Usage: Loaded and rendered by NotificationManager

**tools/:**
- Purpose: Build and development utilities
- Generated: No
- Committed: Yes

**target/:**
- Purpose: Build output directory
- Generated: Yes (by Gradle)
- Committed: No (in .gitignore)

**gradle/:**
- Purpose: Gradle build system files
- Generated: No (wrapper for reproducible builds)
- Committed: Yes

---

*Structure analysis: 2026-04-09*
