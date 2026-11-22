@IsTest(SeeAllData=false)
private class DatatablePlusQueryServiceTest {
	private static DatatablePlusQueryRequest createRequest() {
		DatatablePlusQueryRequest request = new DatatablePlusQueryRequest();
		request.objectApiName = 'Account';
		request.fields = new List<String>{ 'Id', 'Name' };
		request.searchFields = new List<String>();
		request.searchTerm = '';
		request.sortBy = null;
		request.sortDirection = null;
		request.pageNumber = 1;
		request.pageSize = 2;

		return request;
	}

	private static void assertError(DatatablePlusQueryResponse response, String expectedCode) {
		System.assertNotEquals(null, response, 'The service must always return a response');
		System.assertEquals(false, response.ok, 'Expected failures must not be marked successful');
		System.assertNotEquals(
			null,
			response.error,
			'Expected failures must include an error object'
		);
		System.assertEquals(
			expectedCode,
			response.error.errorCode,
			'The documented error code must be returned'
		);
		System.assertEquals(0, response.rows.size(), 'Failed queries must not return rows');
		System.assertEquals(0, response.totalItemCount, 'Failed queries must not return a count');
	}

	@IsTest
	static void requestDefaultsMatchTheDocumentedContract() {
		DatatablePlusQueryRequest request = new DatatablePlusQueryRequest();

		System.assertEquals('', request.objectApiName, 'The object name must default to blank');
		System.assertEquals(0, request.fields.size(), 'Fields must default to an empty list');
		System.assertEquals(0, request.searchFields.size(), 'Search fields must default to empty');
		System.assertEquals('', request.searchTerm, 'Search text must default to blank');
		System.assertEquals(null, request.sortBy, 'Sorting must default to disabled');
		System.assertEquals(null, request.sortDirection, 'Sort direction must default to disabled');
		System.assertEquals(1, request.pageNumber, 'Page number must default to one');
		System.assertEquals(20, request.pageSize, 'Page size must default to twenty');
	}

	@IsTest
	static void queryReturnsSuccessEnvelope() {
		insert new List<Account>{
			new Account(Name = 'DTP Alpha'),
			new Account(Name = 'DTP Beta'),
			new Account(Name = 'DTP Gamma')
		};

		DatatablePlusQueryResponse response = DatatablePlusQueryService.query(createRequest());

		System.assertEquals(true, response.ok, 'A valid request must succeed');
		System.assertEquals(2, response.rows.size(), 'The first page must contain two rows');
		System.assertEquals(
			3,
			response.totalItemCount,
			'The response must include the total count'
		);
		System.assertEquals(1, response.pageNumber, 'The response must echo the requested page');
		System.assertEquals(2, response.pageSize, 'The response must echo the requested page size');
		System.assertEquals(null, response.error, 'A success must not include an error');

		for (SObject row : response.rows) {
			System.assertNotEquals(null, row.get('Name'), 'Rows must contain requested fields');
		}
	}

	@IsTest
	static void queryPaginatesRows() {
		insert new List<Account>{
			new Account(Name = 'DTP Alpha'),
			new Account(Name = 'DTP Beta'),
			new Account(Name = 'DTP Gamma')
		};
		DatatablePlusQueryRequest request = createRequest();
		request.pageNumber = 2;

		DatatablePlusQueryResponse response = DatatablePlusQueryService.query(request);

		System.assertEquals(true, response.ok, 'A valid second page must succeed');
		System.assertEquals(1, response.rows.size(), 'The second page must contain one row');
		System.assertEquals(3, response.totalItemCount, 'The total count must cover all pages');
		System.assertEquals(2, response.pageNumber, 'The response must echo page two');
	}

	@IsTest
	static void queryRejectsNullRequest() {
		assertError(DatatablePlusQueryService.query(null), 'INVALID_INPUT');
	}

	@IsTest
	static void queryRejectsBlankObjectName() {
		DatatablePlusQueryRequest request = createRequest();
		request.objectApiName = '   ';

		assertError(DatatablePlusQueryService.query(request), 'INVALID_INPUT');
	}

	@IsTest
	static void queryRejectsMissingFields() {
		DatatablePlusQueryRequest request = createRequest();
		request.fields = new List<String>();

		assertError(DatatablePlusQueryService.query(request), 'INVALID_INPUT');
	}

	@IsTest
	static void queryRejectsUnknownObject() {
		DatatablePlusQueryRequest request = createRequest();
		request.objectApiName = 'DTP_Missing__c';

		assertError(DatatablePlusQueryService.query(request), 'INVALID_OBJECT');
	}

	@IsTest
	static void queryRejectsUnknownField() {
		DatatablePlusQueryRequest request = createRequest();
		request.fields.add('DTP_Missing__c');

		assertError(DatatablePlusQueryService.query(request), 'INVALID_FIELD');
	}

	@IsTest
	static void queryRejectsNonTextSearchField() {
		DatatablePlusQueryRequest request = createRequest();
		request.searchFields = new List<String>{ 'Industry' };
		request.searchTerm = 'Technology';

		assertError(DatatablePlusQueryService.query(request), 'INVALID_SEARCH_FIELD');
	}

	@IsTest
	static void queryRejectsInvalidSortDirection() {
		DatatablePlusQueryRequest request = createRequest();
		request.sortBy = 'Name';
		request.sortDirection = 'SIDEWAYS';

		assertError(DatatablePlusQueryService.query(request), 'INVALID_INPUT');
	}

	@IsTest
	static void queryRejectsSortFieldOutsideRequestedFields() {
		DatatablePlusQueryRequest request = createRequest();
		request.sortBy = 'Industry';
		request.sortDirection = 'ASC';

		assertError(DatatablePlusQueryService.query(request), 'INVALID_INPUT');
	}

	@IsTest
	static void queryRejectsOutOfRangePageSize() {
		DatatablePlusQueryRequest request = createRequest();
		request.pageSize = 201;

		assertError(DatatablePlusQueryService.query(request), 'INVALID_INPUT');
	}

	@IsTest
	static void queryRejectsOutOfRangePageNumber() {
		DatatablePlusQueryRequest request = createRequest();
		request.pageNumber = 0;

		assertError(DatatablePlusQueryService.query(request), 'INVALID_INPUT');
	}

	@IsTest
	static void queryUsesBoundSearchText() {
		insert new List<Account>{
			new Account(Name = 'DTP Alpha'),
			new Account(Name = 'DTP Beta'),
			new Account(Name = 'Other Account')
		};
		DatatablePlusQueryRequest request = createRequest();
		request.searchFields = new List<String>{ 'Name' };
		request.searchTerm = 'DTP A';

		DatatablePlusQueryResponse response = DatatablePlusQueryService.query(request);

		System.assertEquals(true, response.ok, 'A bound search must succeed');
		System.assertEquals(1, response.rows.size(), 'Only the matching row must be returned');
		System.assertEquals(1, response.totalItemCount, 'The count must reflect the search filter');
		System.assertEquals(
			'DTP Alpha',
			(String) response.rows[0].get('Name'),
			'The matching row must contain the requested field'
		);
	}

	@IsTest
	static void queryAcceptsNullSearchFieldsWithoutSearchText() {
		insert new Account(Name = 'DTP Alpha');
		DatatablePlusQueryRequest request = createRequest();
		request.searchFields = null;

		DatatablePlusQueryResponse response = DatatablePlusQueryService.query(request);

		System.assertEquals(true, response.ok, 'A null search list is valid without search text');
		System.assertEquals(1, response.rows.size(), 'All rows must be returned');
	}

	@IsTest
	static void queryRejectsSearchTextWithoutSearchFields() {
		DatatablePlusQueryRequest request = createRequest();
		request.searchTerm = 'Acme';

		assertError(DatatablePlusQueryService.query(request), 'INVALID_INPUT');
	}

	@IsTest
	static void queryRejectsBlankRequestedField() {
		DatatablePlusQueryRequest request = createRequest();
		request.fields = new List<String>{ '   ' };

		assertError(DatatablePlusQueryService.query(request), 'INVALID_FIELD');
	}

	@IsTest
	static void queryRejectsNullRequestedField() {
		DatatablePlusQueryRequest request = createRequest();
		request.fields = new List<String>{ null };

		assertError(DatatablePlusQueryService.query(request), 'INVALID_FIELD');
	}

	@IsTest
	static void queryRejectsUnknownSearchField() {
		DatatablePlusQueryRequest request = createRequest();
		request.searchFields = new List<String>{ 'DTP_Missing__c' };
		request.searchTerm = 'Acme';

		assertError(DatatablePlusQueryService.query(request), 'INVALID_SEARCH_FIELD');
	}

	@IsTest
	static void queryAcceptsMaximumPageSize() {
		insert new List<Account>{
			new Account(Name = 'DTP Alpha'),
			new Account(Name = 'DTP Beta'),
			new Account(Name = 'DTP Gamma')
		};
		DatatablePlusQueryRequest request = createRequest();
		request.pageSize = 200;

		DatatablePlusQueryResponse response = DatatablePlusQueryService.query(request);

		System.assertEquals(true, response.ok, 'The maximum page size must be accepted');
		System.assertEquals(3, response.rows.size(), 'All rows fit on one maximum-size page');
		System.assertEquals(200, response.pageSize, 'The response must echo the page size');
	}

	@IsTest
	static void queryAcceptsMaximumOffset() {
		insert new Account(Name = 'DTP Alpha');
		DatatablePlusQueryRequest request = createRequest();
		request.pageNumber = 101;
		request.pageSize = 20;

		DatatablePlusQueryResponse response = DatatablePlusQueryService.query(request);

		System.assertEquals(true, response.ok, 'An offset of two thousand must be accepted');
		System.assertEquals(0, response.rows.size(), 'No rows exist at the maximum offset');
		System.assertEquals(1, response.totalItemCount, 'The total count must still be returned');
	}

	@IsTest
	static void queryRejectsOffsetAboveMaximum() {
		DatatablePlusQueryRequest request = createRequest();
		request.pageNumber = 102;
		request.pageSize = 20;

		assertError(DatatablePlusQueryService.query(request), 'INVALID_INPUT');
	}

	@IsTest
	static void queryRejectsNonSortableSortField() {
		DatatablePlusQueryRequest request = createRequest();
		request.fields = new List<String>{ 'Id', 'Name', 'BillingAddress' };
		request.sortBy = 'BillingAddress';
		request.sortDirection = 'ASC';

		assertError(DatatablePlusQueryService.query(request), 'INVALID_INPUT');
	}
}
