public with sharing class DatatablePlusValidation {
	public static String requireNotBlank(String value, String name) {
		if (String.isBlank(value)) {
			throw new AuraHandledException(name + ' is required');
		}

		return value.trim();
	}
}
