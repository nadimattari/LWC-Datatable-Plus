@IsTest
private class DatatablePlusValidationTest {
	@IsTest
	static void requireNotBlankReturnsTrimmedText() {
		String result = DatatablePlusValidation.requireNotBlank('  Accounts  ', 'objectName');

		System.assertEquals(
			'Accounts',
			result,
			'Valid text must be returned without outer whitespace'
		);
	}

	@IsTest
	static void requireNotBlankRejectsBlankText() {
		Boolean thrown = false;

		// Apex tests cannot inspect AuraHandledException messages, so assert only the type.
		try {
			DatatablePlusValidation.requireNotBlank('   ', 'objectName');
		} catch (AuraHandledException error) {
			thrown = error != null;
		}

		System.assert(thrown, 'Blank text must raise an AuraHandledException');
	}
}
