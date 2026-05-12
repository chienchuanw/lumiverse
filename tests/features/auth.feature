Feature: Email/password authentication

  Scenario: Register a new account and authenticate
    Given a clean user table
    When I register with email "ld@studio.com" and password "supersecret"
    Then the registration succeeds with status 201
    And the credentials "ld@studio.com" / "supersecret" are valid

  Scenario: First registered user becomes an admin, the next a member
    Given a clean user table
    When I register "owner@studio.com" then "crew@studio.com"
    Then "owner@studio.com" has role "admin"
    And "crew@studio.com" has role "member"

  Scenario: Write access is denied without a session when auth is enabled
    Given authentication is enabled
    Then writing without a session is rejected as unauthorized
    But writing without a session is allowed when authentication is disabled
