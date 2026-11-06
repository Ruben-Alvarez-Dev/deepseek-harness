# provider-transport Specification

## ADDED Requirements

### Requirement: Error classification completeness

Every error the router throws from its own code paths SHALL be a `RouterError` carrying a fixed diagnostic code from the controlled vocabulary; no internal path SHALL surface an untyped `Error` for conditions consumers may classify.

#### Scenario: Corrupt episode state is typed

- **GIVEN** an episode state file that fails decode
- **WHEN** `decodeEpisodeState` rejects it
- **THEN** a `RouterError` is thrown whose `code` identifies corrupt state, with the existing human-readable message preserved

#### Scenario: Lock acquisition and compromise are typed

- **GIVEN** the episode store lock cannot be acquired, or is compromised mid-transaction
- **WHEN** either failure occurs
- **THEN** a `RouterError` with a fixed code for the lock condition is thrown

#### Scenario: Generic consumers unchanged

- **GIVEN** a consumer that catches `Error` broadly (command handlers, transport bridge)
- **WHEN** it receives one of the newly typed errors
- **THEN** its behavior is unchanged from the previous raw-`Error` behavior except that `.code` is now available
