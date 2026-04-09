# Coding Conventions

**Analysis Date:** 2026-04-09

## Naming Patterns

**Files:**
- PascalCase for class names: `TimeHandler.java`, `MotionHandler.java`, `BasePositionHandler.java`
- Package-based organization: `org.traccar.handler`, `org.traccar.protocol`, `org.traccar.model`
- Test files mirror source structure with `Test` suffix: `TimeHandlerTest.java`, `MotionHandlerTest.java`

**Functions:**
- camelCase for method names: `onPosition()`, `handleRollover()`, `adjustRollover()`, `computeAttribute()`
- Verb-based prefixes for action methods: `handle*`, `on*`, `compute*`, `filter*`
- Private helper methods use descriptive camelCase: `prepareContext()`, `getPrecedingPosition()`

**Variables:**
- camelCase for local variables and parameters: `currentTime`, `overrideProtocols`, `positionTime`, `cacheManager`
- Private fields use camelCase with clear naming: `filter`, `minError`, `maxError`, `engine`
- Constants use UPPER_SNAKE_CASE: `ROLLOVER_CYCLE`, `ROLLOVER_THRESHOLD`, `LOGGER`

**Types:**
- PascalCase for class names: `TimeHandler`, `Position`, `Device`, `Config`
- Interface names use meaningful names without `I` prefix: `Callback`, `CacheManager`
- Nested/inner classes named clearly: `Early extends ComputedAttributesHandler`, `Late extends ComputedAttributesHandler`

## Code Style

**Formatting:**
- Checkstyle 10.23.1 enforces code style (configured in `gradle/checkstyle.xml`)
- Line length maximum: 120 characters
- Encoding: UTF-8
- Newline at end of file: LF (Unix-style)
- No trailing whitespace

**Linting:**
- Checkstyle configuration enforced via Gradle plugin
- Module `NewlineAtEndOfFile` with LF separator
- Module `LineLength` with max 120 characters
- Module `FileTabCharacter` prevents tabs, enforces spaces

**Naming Convention Enforcement:**
- `ConstantName`: UPPER_SNAKE_CASE for static final fields
- `LocalVariableName`: camelCase for local variables
- `MethodName`: camelCase for methods
- `PackageName`: lowercase with dots (org.traccar.handler)
- `TypeName`: PascalCase for classes and interfaces

**Whitespace Rules:**
- Proper spacing around operators and method calls
- Consistent indentation (spaces, not tabs)
- Method parameter padding: `method(arg1, arg2)` not `method( arg1 , arg2 )`

## Import Organization

**Order:**
1. Standard Java imports: `java.*`, `javax.*`
2. Jakarta EE imports: `jakarta.*`
3. External library imports: `org.slf4j`, `io.netty`, etc.
4. Project-specific imports: `org.traccar.*`

**Path Aliases:**
- No custom path aliases observed
- Standard Maven/Gradle package structure used
- Imports grouped by source (standard library first, then external, then project)

**Static Imports:**
- Used selectively for test assertions: `import static org.junit.jupiter.api.Assertions.assertEquals`
- Used for Mockito methods: `import static org.mockito.Mockito.mock`
- Avoid star imports: `AvoidStarImport` rule enforced

## Error Handling

**Patterns:**
- Exception handling in handler layer wraps with try-catch
- Example in `BasePositionHandler.handlePosition()`:
  ```java
  public void handlePosition(Position position, Callback callback) {
      try {
          onPosition(position, callback);
      } catch (RuntimeException e) {
          LOGGER.warn("Position handler failed", e);
          callback.processed(false);
      }
  }
  ```
- Specific exceptions caught when possible: `catch (Exception error)`, `catch (StorageException e)`
- Error names use descriptive variable names: `error`, `throwable`, `e`
- Errors logged with context: `LOGGER.warn("Position handler failed", e)`
- Checked exceptions in method signature: `throws JexlException`, `throws StorageException`
- Exceptions logged with message and exception object: `LOGGER.warn("Failed to store position", error)`

## Logging

**Framework:** SLF4J with JDK14 backend (`org.slf4j:slf4j-jdk14:2.0.17`)

**Patterns:**
- Logger declaration pattern (static final in every class that logs):
  ```java
  private static final Logger LOGGER = LoggerFactory.getLogger(TimeHandler.class);
  ```
- Warning level for exceptional conditions: `LOGGER.warn("Position handler failed", e)`
- Contextual messages with exception: `LOGGER.warn("Failed to store position", error)`
- Examples from codebase:
  - `LOGGER.warn("Position handler failed", e)` in `BasePositionHandler.java:36`
  - `LOGGER.warn("Failed to store position", error)` in `DatabaseHandler.java:47`
  - `LOGGER.warn("Position forwarding failed: " + pending + " pending", throwable)` in `PositionForwardingHandler.java:93`
- No debug-level logging observed in most handlers (focus on warnings/errors)

## Comments

**When to Comment:**
- Code is self-documenting through clear naming and structure
- Class-level licenses/copyright comments required (Apache 2.0)
- Implementation comments are rare; code should be self-explanatory
- No JSDoc/JavaDoc patterns observed for method parameters in handler classes

**Copyright Headers:**
- Every source file includes Apache License 2.0 header
- Format: `/* * Copyright [years] [Author]... * Licensed under... */`
- Multi-author support with multiple Copyright lines

## Function Design

**Size:** 
- Functions are generally small and focused
- Handler classes have one primary method: `onPosition()` or `onPosition()` override
- Helper methods keep logic separated and reusable
- Example: `TimeHandler.java` has ~90 lines, with three focused methods

**Parameters:**
- Constructor injection via `@Inject` annotation: `@Inject public TimeHandler(Config config)`
- Method parameters named descriptively: `Position position`, `Callback callback`
- Use of varargs avoided in favor of explicit parameter types

**Return Values:**
- Return void for callbacks: `callback.processed(false)`
- Return specific types: `Position`, `Date`, `Object`, etc.
- Boxed types used where necessary: `Long`, `Boolean`
- Methods that may not return values throw exceptions rather than returning null

## Module Design

**Exports:**
- Public access to classes meant for injection: marked with `@Singleton` or left public
- Handler base classes marked public: `BasePositionHandler`, `BaseProtocolDecoder`
- Handler implementations extend base classes: `TimeHandler extends BasePositionHandler`
- Package-private access for internal utilities

**Injection Pattern:**
- Google Guice dependency injection used throughout
- Constructor injection annotated with `@Inject`
- Classes marked with `@Singleton` for single-instance lifecycle
- Example: 
  ```java
  @Singleton
  public class TimeHandler extends BasePositionHandler {
      @Inject
      public TimeHandler(Config config) { ... }
  }
  ```

**Access Modifiers:**
- Public classes are injection points
- Private fields for internal state
- Protected methods in base classes for override points
- No package-private classes observed (classes are either public or explicitly nested)

---

*Convention analysis: 2026-04-09*
