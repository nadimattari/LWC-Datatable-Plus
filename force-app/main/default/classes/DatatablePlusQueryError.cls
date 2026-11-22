public with sharing class DatatablePlusQueryError {
	@AuraEnabled
	public String errorCode { get; set; }
	@AuraEnabled
	public String message { get; set; }

	public DatatablePlusQueryError() {
		this.errorCode = '';
		this.message = '';
	}

	public DatatablePlusQueryError(String errorCode, String message) {
		this.errorCode = errorCode;
		this.message = message;
	}
}
