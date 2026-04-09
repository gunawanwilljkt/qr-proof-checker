# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview

**Overall:** Layered event-driven architecture with protocol-based ingestion, position processing pipeline, and REST API exposure

**Key Characteristics:**
- Multi-protocol GPS tracking system supporting 200+ protocols via pluggable protocol implementations
- Netty-based async network I/O with channel pipeline pattern for protocol decoding
- Event-driven position processing with handler chain pattern
- Dependency injection via Google Guice for loose coupling
- Storage abstraction layer supporting multiple database backends
- REST API layer for client interaction via Jersey

## Layers

**Transport/Network Layer:**
- Purpose: Handle raw network connections and protocol decoding
- Location: `src/main/java/org/traccar/` (Base*Protocol*, TrackerServer, TrackerConnector)
- Contains: Netty channel handlers, protocol decoders/encoders, connection management
- Depends on: Netty, configuration
- Used by: Session management, position processing

**Protocol Layer:**
- Purpose: Implement 200+ GPS device protocols (GPS trackers, OBD devices, etc.)
- Location: `src/main/java/org/traccar/protocol/` (Protocol implementations like AdmProtocol, AlematicsProtocol, etc.)
- Contains: Device-specific protocol decoders (parse raw GPS data into positions), encoders (send commands to devices)
- Depends on: Base protocol classes, Netty
- Used by: Transport layer to instantiate and configure protocol handlers

**Session Management Layer:**
- Purpose: Maintain device connection state and session context
- Location: `src/main/java/org/traccar/session/`
- Contains: DeviceSession (holds device ID, channel, connection state), ConnectionManager, device cache
- Depends on: Netty channels, database queries
- Used by: Processing handlers, protocol decoders, network handlers

**Position Processing Pipeline:**
- Purpose: Apply business logic transformations to decoded positions
- Location: `src/main/java/org/traccar/handler/` (Position handlers, event handlers)
- Contains: Chain of responsibility pattern via ProcessingHandler, 25+ specialized handlers
- Depends on: Storage, geocoding services, geofence managers, configuration
- Used by: Main event loop via ProcessingHandler
- Flow: Position → Computed Attributes → Filtering → Time/Distance/Motion → Events → Database → Forwarding

**Business Logic Handlers:**
- Position Processing: `DatabaseHandler`, `TimeHandler`, `DistanceHandler`, `MotionHandler`, `EngineHoursHandler`
- Enrichment: `GeocoderHandler`, `GeolocationHandler`, `SpeedLimitHandler`
- Event Detection: `GeofenceEventHandler`, `MotionEventHandler`, `OverspeedEventHandler`, `AlarmEventHandler` (in `handler/events/`)
- Output: `PositionForwardingHandler` (sends to external systems)

**Data Storage Layer:**
- Purpose: Persist positions, events, device configurations
- Location: `src/main/java/org/traccar/storage/`
- Contains: Abstract Storage interface, DatabaseStorage (JDBC via HikariCP), MemoryStorage
- Depends on: Database drivers (H2, MySQL, PostgreSQL, MariaDB, SQL Server)
- Used by: All other layers for data CRUD operations

**API Layer:**
- Purpose: Expose REST endpoints for web/mobile clients
- Location: `src/main/java/org/traccar/api/`
- Contains: Resource classes (@Path endpoints), security filters, authentication providers
- Depends on: Storage, business services, Jersey framework
- Used by: External clients (web app, mobile apps)

**Support Services:**
- Configuration: `org.traccar.config.Config` and `Keys` - centralized config management
- Notifications: `NotificationManager`, `Notificators` - email/SMS alerts
- Database Managers: `BufferingManager`, `CommandsManager`, `MediaManager`, `StatisticsManager`
- External Services: Geocoders, Geolocation providers, Speed limit providers

## Data Flow

**Real-Time Position Ingestion:**

1. Device connects to TCP/UDP port (protocol-specific)
2. `TrackerServer`/`TrackerConnector` accepts connection
3. `BasePipelineFactory` constructs Netty channel pipeline with:
   - Protocol-specific frame decoder (e.g., `AdmFrameDecoder`)
   - Protocol decoder (e.g., `AdmProtocolDecoder` parses to Position objects)
4. Protocol decoder creates `Position` model with parsed GPS data
5. `MainEventHandler` manages connection state (connect/disconnect)
6. `ProcessingHandler` (singleton, sharable) receives decoded Position
7. Position flows through handler chain:
   - `ComputedAttributesHandler.Early` - adds/calculates attributes
   - `OutdatedHandler` - checks if position is stale
   - `TimeHandler` - normalizes timestamps
   - Filter handlers - removes invalid positions
   - `DistanceHandler` - calculates distance traveled
   - `MotionHandler` - detects movement state
   - `EngineHoursHandler` - accumulates engine runtime
   - `GeocoderHandler` - async reverse geolocation
   - `GeolocationHandler` - cell tower based location
   - `SpeedLimitHandler` - checks speed limits
   - Event handlers - detect GeofenceEvent, MotionEvent, OverspeedEvent, AlarmEvent
   - `PositionForwardingHandler` - sends to external systems (AMQP, Kafka, Redis, HTTP)
   - `DatabaseHandler` - persists final Position to storage
8. Notifications generated from events via `NotificationManager`

**State Management:**

- `DeviceSession`: Per-device connection context (device ID, channel, protocol)
- `CacheManager`: Cache latest positions, devices, users in memory
- `ConnectionManager`: Tracks online/offline device states
- `DeviceAccumulators`: Maintains rolling metrics (distance, hours, odometer)

## Key Abstractions

**BaseProtocol:**
- Purpose: Template for implementing a GPS protocol
- Examples: `AdmProtocol`, `AlematicsProtocol`, `ApelProtocol` (200+ implementations)
- Pattern: Subclass implements `getConnectorList()` to provide server/client connectors; registers protocol metadata

**BaseProtocolDecoder:**
- Purpose: Parse raw GPS device data into Position objects
- Lifecycle: Called once per message from device
- Pattern: Decode binary/text frames → Position with location, speed, attributes

**BasePositionHandler:**
- Purpose: Process Position objects through chain of responsibility
- Callback pattern: `onPosition(Position, Callback)` - handler processes then calls callback to pass to next
- Examples: DatabaseHandler, TimeHandler, GeocoderHandler

**BaseEventHandler:**
- Purpose: Detect events (geofence breach, overspeed, motion start/stop) from positions
- Pattern: Analyze position state → create Event if conditions met
- Examples: GeofenceEventHandler, MotionEventHandler, OverspeedEventHandler

**Storage Interface:**
- Purpose: Abstract database operations
- Implementations: DatabaseStorage (SQL), MemoryStorage (in-memory for tests)
- Methods: `getObjects()`, `addObject()`, `updateObject()`, `removeObject()`, `getPermissions()`

## Entry Points

**Main.main():**
- Location: `src/main/java/org/traccar/Main.java`
- Triggers: JVM startup with config file argument
- Responsibilities:
  1. Loads configuration from XML file
  2. Creates Guice injector with MainModule, DatabaseModule, WebModule
  3. Starts ScheduleManager, ServerManager, WebServer, BroadcastService
  4. Registers JVM shutdown hook for graceful shutdown

**ServerManager.start():**
- Location: `src/main/java/org/traccar/ServerManager.java`
- Triggers: Called from Main during startup
- Responsibilities:
  1. Scans classpath for BaseProtocol implementations
  2. Filters enabled protocols from config
  3. Starts TrackerConnector for each enabled protocol
  4. Each connector listens on protocol-specific port (e.g., port 5001 for Adm)

**WebServer.start():**
- Location: `src/main/java/org/traccar/web/WebServer.java`
- Triggers: Called from Main during startup
- Responsibilities: Start Jetty HTTP/WebSocket servers for REST API and web client

**API Endpoints:**
- Location: `src/main/java/org/traccar/api/resource/`
- Examples: `DeviceResource`, `PositionResource`, `EventResource`, `UserResource`
- Pattern: Jersey @Path resources extending BaseResource for authentication/storage access

## Error Handling

**Strategy:** Fail-safe with logging - handlers catch exceptions, log, and pass control to next handler

**Patterns:**

- Protocol decoding errors: Logged via StandardLoggingHandler, position dropped
- Storage failures: DatabaseHandler catches StorageException, logs, continues
- Event handler failures: BaseEventHandler wraps onPosition() with try-catch
- Network errors: MainEventHandler catches IOException, logs, closes channel
- API errors: ResourceErrorHandler converts exceptions to JSON error responses

## Cross-Cutting Concerns

**Logging:** 
- Framework: SLF4J with Logback
- Approach: Each class has static Logger, protocol-specific logging via NetworkUtil.session() for context
- Pattern: `LOGGER.info()`, `LOGGER.warn()` at key lifecycle points (device connect, position received, errors)

**Validation:**
- Position validation: FilterHandler removes invalid (null location, stale timestamps)
- Device lookup: BaseProtocolDecoder uses DeviceLookupService to find device by unique ID
- Permissions: API endpoints use PermissionsService to check user access to resources

**Authentication:**
- Framework: Custom via UserPrincipal in SecurityContext
- Providers: Token-based (JWT), LDAP, OpenID Connect
- Location: `src/main/java/org/traccar/api/security/`

**Concurrency:**
- Thread-safe collections: ConcurrentHashMap for protocol registry, connection map
- Netty guarantees: Pipeline handlers execute in single channel thread
- Injection scope: Singletons for shared services (ProcessingHandler, DatabaseHandler)

---

*Architecture analysis: 2026-04-09*
