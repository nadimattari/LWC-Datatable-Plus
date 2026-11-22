public with sharing class DatatablePlusQueryResponse {
	@AuraEnabled
	public Boolean ok { get; set; }
	@AuraEnabled
	public List<SObject> rows { get; set; }
	@AuraEnabled
	public Integer totalItemCount { get; set; }
	@AuraEnabled
	public Integer pageNumber { get; set; }
	@AuraEnabled
	public Integer pageSize { get; set; }
	@AuraEnabled
	public DatatablePlusQueryError error { get; set; }

	public DatatablePlusQueryResponse() {
		this.ok = false;
		this.rows = new List<SObject>();
		this.totalItemCount = 0;
		this.pageNumber = 1;
		this.pageSize = 20;
		this.error = null;
	}
}
