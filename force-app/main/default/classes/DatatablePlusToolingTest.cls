@IsTest
private class DatatablePlusToolingTest {
	@IsTest
	static void apexTestRunnerExecutesAssertions() {
		System.assertNotEquals(
			null,
			Schema.SObjectType.Account,
			'The validation org must expose standard object schema'
		);
	}
}
