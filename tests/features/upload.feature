Feature: Uploading a fixture version

  Scenario: A new fixture is created from an upload
    Given an empty fixture catalogue
    When I upload "Robe" / "MegaPointe" version "1.0.0" from a .dfix with contents "DFIX-A"
    Then the upload succeeds with status 201
    And the catalogue has 1 fixture with 1 version

  Scenario: A byte-identical re-upload to the same fixture is rejected
    Given an empty fixture catalogue
    And "Clay Paky" / "Sharpy" version "1.0.0" was uploaded from a .dfix with contents "SAME"
    When I upload another version of "Clay Paky" / "Sharpy" version "2.0.0" from a .dfix with contents "SAME"
    Then the upload is rejected with status 409
    And that fixture still has 1 version

  Scenario: The same .dfix under a different fixture is accepted with a warning
    Given an empty fixture catalogue
    And "Robe" / "MegaPointe" version "1.0.0" was uploaded from a .dfix with contents "SHARED"
    When I upload "Martin" / "MAC Aura" version "1.0.0" from a .dfix with contents "SHARED"
    Then the upload succeeds with status 201
    And the response warns that the file is byte-identical to another fixture
