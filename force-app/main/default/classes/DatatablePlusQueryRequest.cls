public with sharing class DatatablePlusQueryRequest {
	@AuraEnabled
	public String objectApiName { get; set; }
	@AuraEnabled
	public List<String> fields { get; set; }
	@AuraEnabled
	public List<String> searchFields { get; set; }
	@AuraEnabled
	public String searchTerm { get; set; }
	@AuraEnabled
	public String sortBy { get; set; }
	@AuraEnabled
	public String sortDirection { get; set; }
	@AuraEnabled
	public Integer pageNumber { get; set; }
	@AuraEnabled
	public Integer pageSize { get; set; }

	public DatatablePlusQueryRequest() {
		this.objectApiName = '';
		this.fields = new List<String>();
		this.searchFields = new List<String>();
		this.searchTerm = '';
		this.pageNumber = 1;
		this.pageSize = 20;
	}
}
