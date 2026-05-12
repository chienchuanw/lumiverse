Feature: In-memory fixture storage

  Scenario: Store and retrieve a fixture file
    Given an empty storage client
    When I store a fixture file "fixtures/demo.dfix" with contents "DFIX-DATA"
    Then retrieving "fixtures/demo.dfix" returns "DFIX-DATA"
