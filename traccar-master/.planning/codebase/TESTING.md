# Testing Patterns

**Analysis Date:** 2026-04-09

## Test Framework

**Runner:**
- JUnit Jupiter 6.0.3 (JUnit 5 platform)
- Config: No dedicated config file; uses Gradle `useJUnitPlatform()` in `build.gradle:151`

**Assertion Library:**
- JUnit Jupiter Assertions API
- Static imports: `import static org.junit.jupiter.api.Assertions.*`
- Methods used: `assertEquals()`, `assertTrue()`, `assertFalse()`, `assertNotNull()`, `assertNull()`, `assertInstanceOf()`

**Run Commands:**
```bash
./gradlew test              # Run all tests
./gradlew test --continuous # Watch mode (continuous testing)
./gradlew test --info       # Run with info-level logging
```

## Test File Organization

**Location:**
- Mirror source structure under `src/test/java/`
- Tests co-located with matching package: `src/main/java/org/traccar/handler/TimeHandler.java` → `src/test/java/org/traccar/handler/TimeHandlerTest.java`
- Base test utilities in `src/test/java/org/traccar/BaseTest.java`

**Naming:**
- Suffix pattern: `[ClassName]Test.java`
- Examples: `TimeHandlerTest.java`, `MotionHandlerTest.java`, `FilterHandlerTest.java`, `ProtocolTest.java`
- Test methods prefixed with `test`: `testAdjustRollover()`, `testCalculateMotion()`, `testFilter()`

**Structure:**
```
src/test/java/
├── org/traccar/
│   ├── BaseTest.java                    # Base test utilities and mocking
│   ├── ProtocolTest.java                # Protocol-level test utilities
│   ├── handler/
│   │   ├── TimeHandlerTest.java
│   │   ├── MotionHandlerTest.java
│   │   ├── FilterHandlerTest.java
│   │   └── events/
│   │       └── [EventHandlerTest files]
│   └── protocol/
│       └── [ProtocolDecoderTest files]
```

## Test Structure

**Suite Organization:**
Tests use JUnit Jupiter annotations without explicit suite organization:
```java
package org.traccar.handler;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;

public class FilterHandlerTest extends BaseTest {

    private FilterHandler passingHandler;
    private FilterHandler filteringHandler;

    @BeforeEach
    public void passingHandler() {
        // Setup logic
    }

    @BeforeEach
    public void filteringHandler() {
        // Setup logic
    }

    @Test
    public void testFilter() {
        // Test implementation
    }
}
```

**Patterns:**
- Setup: Use `@BeforeEach` annotated methods for per-test initialization
- Teardown: No explicit teardown observed; resources managed by mocks
- Assertion: Direct static assertions from JUnit Jupiter
- Test inheritance: Extend `BaseTest` for access to injection helpers
- No explicit test suites or grouping beyond class structure

## Mocking

**Framework:** Mockito 5.21.0

**Patterns:**
```java
// Mock creation
var config = mock(Config.class);
var cacheManager = mock(CacheManager.class);

// Mock configuration (when-then)
when(config.getBoolean(Keys.FILTER_ENABLE)).thenReturn(true);
when(cacheManager.getConfig()).thenReturn(config);
when(cacheManager.getObject(eq(Device.class), anyLong())).thenReturn(device);

// Verification via BaseTest helper
protected <T extends BaseProtocolDecoder> T inject(T decoder) throws Exception {
    var config = new Config();
    decoder.setConfig(config);
    var device = mock(Device.class);
    when(device.getId()).thenReturn(1L);
    // ... additional mock setup
    return decoder;
}
```

**What to Mock:**
- External dependencies: `Config`, `CacheManager`, `Device`, `ConnectionManager`
- Infrastructure: `Channel`, `SocketAddress`, `StatisticsManager`, `MediaManager`
- Complex objects needed for setup
- Database/storage calls via `StorageException` mocking

**What NOT to Mock:**
- Simple data model objects: `Position`, `Attribute`, `Command` (create real instances)
- Handler/decoder implementations under test (test the real object)
- Core business logic (instantiate real implementations when possible)
- Example from `ComputedAttributesTest.java`:
  ```java
  // Real object created for testing
  ComputedAttributesHandler handler = new ComputedAttributesHandler(new Config(), null, false);
  Position position = new Position();
  position.setTime(date);
  position.setSpeed(42);
  ```

## Fixtures and Factories

**Test Data:**
Pattern from `FilterHandlerTest.java:57`:
```java
private Position createPosition(Date time, boolean valid, double speed) {
    Position position = new Position();
    position.setDeviceId(0);
    position.setTime(time);
    position.setValid(valid);
    position.setLatitude(10);
    position.setLongitude(10);
    position.setAltitude(10);
    position.setSpeed(speed);
    position.setCourse(10);
    return position;
}
```

Pattern from `ProtocolTest.java:38`:
```java
protected Position position(String time, boolean valid, double lat, double lon) throws ParseException {
    Position position = new Position();
    DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS");
    dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
    position.setTime(dateFormat.parse(time));
    position.setValid(valid);
    position.setLatitude(lat);
    position.setLongitude(lon);
    return position;
}
```

**Location:**
- Factory methods defined in test classes themselves (no separate factory classes)
- Base test helper methods in `BaseTest.java` for common injection patterns
- Protocol test utilities in `ProtocolTest.java` for binary/text data construction:
  ```java
  protected ByteBuf binary(String... data) {
      return Unpooled.wrappedBuffer(DataConverter.parseHex(concatenateStrings(data)));
  }
  
  protected String text(String... data) {
      return concatenateStrings(data);
  }
  
  protected ByteBuf buffer(String... data) {
      return Unpooled.copiedBuffer(concatenateStrings(data), StandardCharsets.ISO_8859_1);
  }
  ```

## Coverage

**Requirements:** No enforced coverage threshold detected in build configuration

**View Coverage:**
Coverage reporting not configured in standard Gradle build. Use:
```bash
./gradlew test --info    # Run tests with detailed output
```

Note: No JaCoCo or similar coverage plugin detected in `build.gradle`. Coverage measurement would require manual setup.

## Test Types

**Unit Tests:**
- **Scope:** Individual handler/decoder components
- **Approach:** Test one class in isolation with mocked dependencies
- **Example:** `TimeHandlerTest.java` tests `TimeHandler.adjustRollover()` method directly
- **Location:** `src/test/java/org/traccar/handler/`, `src/test/java/org/traccar/protocol/`

**Integration Tests:**
- **Scope:** Multiple components working together
- **Approach:** Tests that use `BaseTest.inject()` to set up realistic dependency graphs
- **Example:** `FilterHandlerTest.java` tests `FilterHandler` with mocked `CacheManager` and `Config`
- **Location:** Same location as unit tests; distinguished by test method implementation

**E2E Tests:**
- **Framework:** Not used in this codebase
- **Status:** No end-to-end tests detected

## Common Patterns

**Async Testing:**
No async test patterns observed in Traccar codebase. Handler methods are synchronous with callbacks.

**Error Testing:**
```java
// From TimeHandlerTest.java - testing exception conditions
@Test
public void testAdjustRollover() {
    long currentTime = Instant.parse("2025-08-19T00:00:00Z").toEpochMilli();
    long invalidTime = currentTime - 1024 * Duration.ofDays(7).toMillis();
    long validTime = currentTime - Duration.ofDays(7).toMillis();
    
    assertEquals(currentTime, TimeHandler.adjustRollover(currentTime, new Date(invalidTime)).getTime());
    assertEquals(validTime, TimeHandler.adjustRollover(currentTime, new Date(validTime)).getTime());
}
```

**Handler Testing Pattern:**
```java
// From MotionHandlerTest.java - testing handler behavior
@Test
public void testCalculateMotion() {
    var cacheManager = mock(CacheManager.class);
    when(cacheManager.getObject(eq(Device.class), anyLong())).thenReturn(mock(Device.class));
    var config = mock(Config.class);
    when(config.getString(Keys.EVENT_MOTION_SPEED_THRESHOLD.getKey())).thenReturn("0.01");
    when(cacheManager.getConfig()).thenReturn(config);

    MotionHandler motionHandler = new MotionHandler(cacheManager);

    Position position = new Position();
    motionHandler.handlePosition(position, p -> {});

    assertEquals(false, position.getAttributes().get(Position.KEY_MOTION));
}
```

**Protocol Decoder Testing Pattern:**
From `ProtocolTest.java` - tests use helper methods for data construction:
```java
// Binary protocol parsing
protected ByteBuf binary(String... data) {
    return Unpooled.wrappedBuffer(DataConverter.parseHex(concatenateStrings(data)));
}

// HTTP request construction
protected DefaultFullHttpRequest request(HttpMethod method, String url, ByteBuf data) {
    return new DefaultFullHttpRequest(HttpVersion.HTTP_1_1, method, url, data);
}
```

---

*Testing analysis: 2026-04-09*
